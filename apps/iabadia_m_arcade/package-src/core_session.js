// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const crypto = require('crypto');
const registry = require('./core_registry.js'),
    scores = require('./core_scores.js'),
    { Input } = require('./core_input.js'),
    { clone } = require('./core_saves.js');
class Session {
    constructor(opts) {
        this.opts = opts || {};
        this.store = this.opts.store;
        this.visible = false;
        this.route = 'library';
        this.selected = 0;
        this.menu = null;
        this.focus = 0;
        this.clock = 0;
        this.stamp = null;
        this.notice = '';
        this.runtime = null;
        this.envelope = null;
        this.definition = null;
        this.pendingLeave = false;
        this.lastCheckpoint = 0;
        this.saved = {};
        registry.games.forEach((g) => {
            this.saved[g.id] = !!(this.store.has && this.store.has(g));
        });
        this.controller = new Input((a, n) => this.input(a, n));
        try {
            const shell = this.store.shell();
            if (shell)
                this.selected = Math.max(
                    0,
                    registry.games.findIndex((g) => g.id === shell.selected),
                );
        } catch (e) {
            this.notice = e.message;
        }
    }
    now() {
        return this.opts.now ? this.opts.now() : Date.now();
    }
    changed() {
        if (this.opts.change) this.opts.change();
    }
    get game() {
        return this.runtime && this.runtime.game;
    }
    ccu(e) {
        if (this.visible) this.controller.ccu(e);
        else this.controller.reset();
    }
    targetDepth() {
        return this.route === 'library'
            ? 1
            : !this.menu
              ? 2
              : [
                      'confirm',
                      'difficulty',
                      'scores',
                      'help',
                      'initials',
                  ].includes(this.menu)
                ? 4
                : 3;
    }
    shellSave() {
        try {
            this.store.saveShell({
                version: 1,
                selected: registry.games[this.selected].id,
            });
            return true;
        } catch (e) {
            this.notice = 'Could not save. Press to retry.';
            return false;
        }
    }
    checkpoint() {
        if (!this.runtime) return this.shellSave();
        try {
            const next = Object.assign({}, this.envelope, {
                state: this.runtime.snapshot(),
            });
            this.store.save(this.definition, next);
            this.envelope = next;
            this.notice = '';
            this.lastCheckpoint = this.now();
            return true;
        } catch (e) {
            this.notice = 'Could not save. Retry before leaving.';
            if (!this.menu) this.menu = 'pause';
            return false;
        }
    }
    activate(id) {
        if (this.runtime || this.pendingLeave) return false;
        const def = registry.get(id);
        if (!def) return false;
        try {
            let saved = this.store.load(def);
            const recovering = this.store.recovered;
            this.clock = 0;
            const runtime = def
                .load()
                .create(
                    saved ? saved.modeId : def.defaultMode,
                    saved && saved.state,
                    {
                        now: () => this.clock,
                        random: this.opts.random || Math.random,
                    },
                );
            const env = saved || {
                envelopeVersion: 1,
                gameId: def.id,
                stateVersion: def.stateVersion,
                modeId: def.defaultMode,
                runId: crypto.randomBytes(12).toString('hex'),
                state: runtime.snapshot(),
                records: {},
                initialsDraft: null,
            };
            this.saved[def.id] = !!saved;
            this.runtime = runtime;
            this.definition = def;
            this.envelope = env;
            this.route = 'game';
            this.menu = saved ? 'pause' : null;
            this.focus = 0;
            this.stamp = this.now();
            this.lastCheckpoint = this.now();
            this.syncBest();
            if (env.initialsDraft) this.menu = 'initials';
            else if (['won', 'lost'].includes(runtime.phase()))
                this.menu = runtime.phase();
            if (!this.checkpoint()) this.menu = 'pause';
            else if (recovering) this.notice = 'Recovered your backup save.';
            this.controller.reset();
            this.changed();
            return true;
        } catch (e) {
            this.notice = e.message;
            this.changed();
            return false;
        }
    }
    syncBest() {
        if (this.runtime)
            this.runtime.applyRecords(
                this.envelope.records,
                this.definition.rankings[0].metric,
            );
    }
    openMenu(kind) {
        this.runtime.pause();
        this.menu =
            kind ||
            (['won', 'lost'].includes(this.runtime.phase())
                ? this.runtime.phase()
                : 'pause');
        this.focus = 0;
        this.controller.reset();
        this.stamp = this.now();
        this.checkpoint();
    }
    resume() {
        if (this.notice && !this.checkpoint()) return;
        if (this.runtime.canContinue())
            this.runtime.input({ type: 'continue' });
        if (['lost', 'won'].includes(this.runtime.phase())) return;
        this.menu = null;
        this.focus = 0;
        this.stamp = this.now();
        this.controller.reset();
        this.checkpoint();
    }
    leave(native) {
        if (!this.runtime) return true;
        if (!this.checkpoint()) {
            if (native) {
                this.route = 'library';
                this.pendingLeave = true;
                this.menu = null;
            }
            return false;
        }
        this.saved[this.definition.id] = true;
        this.runtime.dispose();
        this.runtime = null;
        this.definition = null;
        this.envelope = null;
        this.route = 'library';
        this.menu = null;
        this.pendingLeave = false;
        this.controller.reset();
        this.shellSave();
        this.changed();
        return true;
    }
    nativeBack(depth) {
        if (depth === 1) this.leave(true);
        else if (depth === 2) {
            if (this.envelope && this.envelope.initialsDraft)
                this.envelope.initialsDraft = null;
            this.menu = null;
            if (['won', 'lost'].includes(this.runtime.phase()))
                this.menu = this.runtime.phase();
            this.stamp = this.now();
            this.checkpoint();
        } else if (depth === 3) {
            if (this.envelope && this.envelope.initialsDraft)
                this.envelope.initialsDraft = null;
            this.openMenu();
        }
        this.controller.reset();
        this.changed();
    }
    visibility(on) {
        if (!on && this.runtime) {
            this.runtime.pause();
            if (!this.menu) this.menu = 'pause';
            this.checkpoint();
        }
        this.visible = on;
        this.stamp = this.now();
        this.controller.reset();
        this.changed();
    }
    advance(now) {
        now = now === undefined ? this.now() : now;
        const elapsed = this.stamp === null ? 0 : Math.max(0, now - this.stamp);
        this.stamp = now;
        if (
            !this.visible ||
            this.route !== 'game' ||
            this.menu ||
            !this.runtime
        )
            return;
        const wasAnimating = this.runtime.animating(),
            previousMenu = this.menu;
        const dt = Math.min(elapsed, this.definition.timing.maxDeltaMs);
        this.clock += dt;
        const e = this.runtime.update(dt, this.clock) || {};
        this.complete();
        if (
            !this.menu &&
            ((e.checkpoint && now - this.lastCheckpoint >= 500) ||
                now - this.lastCheckpoint >= 2000)
        )
            this.checkpoint();
        return !!e.dirty || wasAnimating || previousMenu !== this.menu;
    }
    animating() {
        return !!(
            this.visible &&
            this.runtime &&
            this.route === 'game' &&
            !this.menu &&
            this.runtime.animating()
        );
    }
    complete() {
        const phase = this.runtime.phase();
        if (!['won', 'lost'].includes(phase) || this.runtime.animating())
            return;
        this.menu = phase;
        this.focus = 0;
        const c = this.runtime.scoreCandidate();
        if (
            scores.qualifies(
                this.definition,
                this.envelope.records,
                this.envelope.runId,
                c,
            ) &&
            this.envelope.promptedValue !== c.value
        ) {
            this.envelope.promptedValue = c.value;
            this.enterInitials(phase);
        } else this.checkpoint();
        this.controller.reset();
    }
    canSubmit() {
        return (
            this.runtime &&
            scores.qualifies(
                this.definition,
                this.envelope.records,
                this.envelope.runId,
                this.runtime.scoreCandidate(),
            )
        );
    }
    enterInitials(parent) {
        const c = this.runtime.scoreCandidate();
        if (!this.canSubmit()) return;
        this.envelope.initialsDraft = {
            name: 'AAA',
            cursor: 0,
            candidate: c,
            returnTo: parent || 'scores',
        };
        this.menu = 'initials';
        this.focus = 0;
        this.checkpoint();
    }
    submit() {
        const next = clone(this.envelope),
            d = next.initialsDraft;
        try {
            scores.record(
                this.definition,
                next.records,
                next.runId,
                d.candidate,
                d.name,
            );
            next.initialsDraft = null;
            next.state = this.runtime.snapshot();
            this.store.save(this.definition, next);
            this.envelope = next;
            this.notice = '';
            this.syncBest();
            this.menu = 'scores';
            this.focus = 0;
        } catch (e) {
            this.notice = 'Could not save your name. Press to retry.';
        }
    }
    newGame() {
        const old = this.runtime,
            env = this.envelope,
            mode = this.pendingMode || env.modeId;
        const runtime = this.definition.load().create(mode, undefined, {
            now: () => this.clock,
            random: this.opts.random || Math.random,
        });
        const next = Object.assign({}, env, {
            modeId: mode,
            runId: crypto.randomBytes(12).toString('hex'),
            state: runtime.snapshot(),
            initialsDraft: null,
            promptedValue: null,
        });
        try {
            this.store.save(this.definition, next);
            old.dispose();
            this.runtime = runtime;
            this.envelope = next;
            this.syncBest();
            this.menu = null;
            this.focus = 0;
            this.notice = '';
            this.stamp = this.now();
            this.controller.reset();
        } catch (e) {
            runtime.dispose();
            this.notice = 'Could not start a new game. Try again.';
        }
    }
    labels() {
        if (this.route === 'library') return [];
        if (this.menu === 'initials') return [];
        if (this.menu === 'confirm') return ['Cancel', 'Start new game'];
        if (this.menu === 'difficulty')
            return this.definition.modes
                .map((m) => m.label)
                .concat(['Back to menu']);
        if (this.menu === 'help') return ['Back to menu'];
        if (this.menu === 'scores')
            return (this.canSubmit() ? ['Save current score'] : []).concat([
                'Back to menu',
            ]);
        const phase = this.runtime.phase();
        return (
            !['won', 'lost'].includes(phase)
                ? ['Resume']
                : phase === 'won' && this.runtime.canContinue()
                  ? ['Keep playing']
                  : []
        ).concat(
            ['New game'],
            this.definition.modes.length > 1 ? ['Difficulty'] : [],
            ['Records', 'How to play', 'Back to Arcade', 'Exit M Arcade'],
        );
    }
    select() {
        const label = this.labels()[this.focus];
        if (label === 'Resume' || label === 'Keep playing') this.resume();
        else if (label === 'New game') {
            this.pendingMode = this.envelope.modeId;
            this.openMenu('confirm');
        } else if (label === 'Difficulty') this.openMenu('difficulty');
        else if (label === 'Records') this.openMenu('scores');
        else if (label === 'How to play') this.openMenu('help');
        else if (label === 'Back to menu' || label === 'Cancel')
            this.openMenu();
        else if (label === 'Save current score') this.enterInitials('scores');
        else if (label === 'Start new game') this.newGame();
        else if (label === 'Back to Arcade') this.leave();
        else if (label === 'Exit M Arcade') this.exit();
        else {
            const m = this.definition.modes.find((m) => m.label === label);
            if (m) {
                this.pendingMode = m.id;
                this.openMenu('confirm');
            }
        }
    }
    exit() {
        if (!this.checkpoint() || !this.shellSave()) return false;
        if (this.runtime) {
            this.saved[this.definition.id] = true;
            this.runtime.dispose();
            this.runtime = null;
            this.envelope = null;
            this.definition = null;
        }
        this.route = 'library';
        this.menu = null;
        this.visible = false;
        this.controller.reset();
        if (this.opts.exit) this.opts.exit();
        return true;
    }
    input(action, amount) {
        if (
            !this.visible ||
            ![
                'rotate',
                'up',
                'down',
                'left',
                'right',
                'center',
                'back',
            ].includes(action)
        )
            return;
        if (
            action === 'rotate' &&
            (!Number.isInteger(amount) || Math.abs(amount) > 24 || amount === 0)
        )
            return;
        const previous = this.menu;
        this.advance();
        if (previous !== this.menu) {
            this.changed();
            return;
        }
        if (this.route === 'library') {
            if (this.pendingLeave) {
                if (action === 'center') this.leave(true);
                this.changed();
                return;
            }
            if (action === 'center')
                this.activate(registry.games[this.selected].id);
            else if (action === 'back') this.exit();
            else if (
                ['rotate', 'left', 'right', 'up', 'down'].includes(action)
            ) {
                const n =
                    action === 'rotate'
                        ? amount
                        : action === 'left'
                          ? -1
                          : action === 'right'
                            ? 1
                            : action === 'up'
                              ? -2
                              : 2;
                this.selected = Math.max(
                    0,
                    Math.min(registry.games.length - 1, this.selected + n),
                );
                this.notice = '';
                this.shellSave();
            }
            this.changed();
            return;
        }
        if (this.menu === 'initials') {
            const d = this.envelope.initialsDraft;
            if (action === 'rotate' || action === 'up' || action === 'down') {
                const delta =
                    action === 'rotate' ? amount : action === 'up' ? 1 : -1;
                const a = d.name.split('');
                a[d.cursor] = String.fromCharCode(
                    65 +
                        ((((a[d.cursor].charCodeAt(0) - 65 + delta) % 26) +
                            26) %
                            26),
                );
                d.name = a.join('');
                this.checkpoint();
            } else if (action === 'left' || action === 'right') {
                d.cursor = Math.max(
                    0,
                    Math.min(2, d.cursor + (action === 'left' ? -1 : 1)),
                );
                this.checkpoint();
            } else if (action === 'center') {
                if (d.cursor < 2) {
                    d.cursor++;
                    this.checkpoint();
                } else this.submit();
            } else if (action === 'back') {
                const parent = d.returnTo;
                this.envelope.initialsDraft = null;
                this.openMenu(parent);
            }
            this.changed();
            return;
        }
        if (this.menu) {
            if (action === 'rotate' || action === 'up' || action === 'down')
                this.focus = Math.max(
                    0,
                    Math.min(
                        this.labels().length - 1,
                        this.focus +
                            (action === 'rotate'
                                ? amount
                                : action === 'up'
                                  ? -1
                                  : 1),
                    ),
                );
            else if (action === 'center') this.select();
            else if (action === 'back') {
                if (this.menu === 'pause') this.resume();
                else this.openMenu();
            }
        } else if (action === 'back') this.leave();
        else if (
            action === 'center' &&
            this.definition.controls.centerDuringPlay === 'pause'
        )
            this.openMenu();
        else {
            const a =
                action === 'rotate'
                    ? { type: 'wheel', steps: amount }
                    : action === 'center'
                      ? { type: 'center' }
                      : { type: 'tilt', direction: action };
            const effect = this.runtime.input(a) || {};
            if (effect.pause) this.openMenu();
            else {
                this.complete();
                if (effect.checkpoint) this.checkpoint();
            }
        }
        this.changed();
    }
}
module.exports = { Session };
