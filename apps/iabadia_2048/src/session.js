// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const { Game } = require('./game.js');
const leaderboard = require('./leaderboard.js');
// FrontCCU deflection ordinals; short and long are one held direction.
const TILT = { 1: 'up', 2: 'up', 4: 'right', 5: 'right', 7: 'down', 8: 'down', 10: 'left', 11: 'left' };
const SLIDE_MS = 120, POP_MS = 140, ANIMATION_MS = SLIDE_MS + POP_MS;
const FOCUS_MS = 120, PRESS_MS = 90, SCORE_MS = 650;
class Session {
    constructor(saved, opts) {
        this.opts = opts || {}; this.game = new Game(saved, this.opts.random);
        this.arcade = leaderboard.create(saved && saved.arcade);
        this.menu = null; this.focus = 0; this.visible = false; this.last = null;
        this.animation = null;
        this.focusMotion = null; this.pressFeedback = null; this.scoreFeedback = null;
        this.notice = ''; this.save();
    }
    save() {
        try { if (this.opts.save) this.opts.save(this.snapshot()); this.notice = ''; return true; }
        catch (e) { this.notice = 'Could not save. Try again.'; return false; }
    }
    snapshot() { return Object.assign(this.game.snapshot(), { arcade: JSON.parse(JSON.stringify(this.arcade)) }); }
    canSubmit() { return leaderboard.qualifies(this.arcade, this.game.score); }
    enterInitials(returnTo) {
        this.arcade.draft = this.arcade.draft || { name: 'AAA', cursor: 0, returnTo: returnTo || 'scores' };
        this.openMenu('initials'); this.save();
    }
    submitInitials() {
        const backup = JSON.parse(JSON.stringify(this.arcade));
        leaderboard.record(this.arcade, this.arcade.draft.name, this.game.score);
        if (this.save()) this.openMenu('scores');
        else this.arcade = backup;
    }
    changed() { if (this.opts.change) this.opts.change(); }
    now() { return this.opts.now ? this.opts.now() : Date.now(); }
    animating() { return !!(this.visible && (this.animation || this.focusMotion || this.pressFeedback || this.scoreFeedback)); }
    focusPosition(now) {
        const m = this.focusMotion;
        if (!m) return this.focus;
        const p = Math.max(0, Math.min(1, (now - m.started) / FOCUS_MS));
        return m.from + (m.to - m.from) * (1 - Math.pow(1 - p, 3));
    }
    advance(now) {
        now = now === undefined ? this.now() : now;
        if (this.focusMotion && now - this.focusMotion.started >= FOCUS_MS) this.focusMotion = null;
        if (this.pressFeedback && now - this.pressFeedback.started >= PRESS_MS) this.pressFeedback = null;
        if (this.scoreFeedback && now - this.scoreFeedback.started >= SCORE_MS) this.scoreFeedback = null;
        if (this.animation && now - this.animation.started >= ANIMATION_MS) {
            this.animation = null;
            if (this.game.won() || this.game.over()) this.openMenu();
        }
    }
    openMenu(kind) {
        this.animation = null; this.scoreFeedback = null; this.focusMotion = null;
        this.menu = kind || (this.game.won() ? 'won' : this.game.over() ? 'over' : 'pause'); this.focus = 0;
        if (!kind && this.menu === 'over' && this.canSubmit() && this.arcade.promptedScore !== this.game.score) {
            this.arcade.promptedScore = this.game.score; this.enterInitials('over');
        }
    }
    labels(menu) {
        menu = menu || this.menu;
        if (menu === 'confirm') return ['Cancel', 'Start new game'];
        if (menu === 'help') return ['Back to menu'];
        if (menu === 'initials') return [];
        if (menu === 'scores') return (this.canSubmit() ? ['Save current score'] : []).concat(['Back to menu']);
        return (menu === 'over' ? [] : [menu === 'won' ? 'Keep playing' : 'Resume'])
            .concat(menu === 'over' && this.canSubmit() ? ['Save score'] : [])
            .concat(['New game', 'High scores', 'How to play', 'Exit app']);
    }
    visibility(on) {
        this.visible = on; this.last = null;
        if (!on) { if (this.menu !== 'initials') this.openMenu(); this.pressFeedback = null; this.save(); }
        else if (this.arcade.draft) this.openMenu('initials');
        else if (this.game.over() || this.game.won()) this.openMenu();
        this.changed();
    }
    input(action, amount) {
        if (!this.visible) return;
        if (this.menu === 'initials') {
            const d = this.arcade.draft;
            if (action === 'rotate' || action === 'up' || action === 'down') {
                const delta = action === 'rotate' ? amount : action === 'up' ? 1 : -1;
                const chars = d.name.split(''); chars[d.cursor] = String.fromCharCode(65 + ((chars[d.cursor].charCodeAt(0) - 65 + delta) % 26 + 26) % 26);
                d.name = chars.join(''); this.save();
            } else if (action === 'left' || action === 'right') { d.cursor = Math.max(0, Math.min(2, d.cursor + (action === 'left' ? -1 : 1))); this.save(); }
            else if (action === 'center') { if (d.cursor < 2) { d.cursor++; this.save(); } else this.submitInitials(); }
            else if (action === 'back') { const returnTo = d.returnTo; this.arcade.draft = null; this.openMenu(returnTo); this.save(); }
            this.changed(); return;
        }
        if (this.menu && (action === 'up' || action === 'down')) { amount = action === 'up' ? -1 : 1; action = 'rotate'; }
        if (action === 'rotate') {
            if (this.menu) {
                const focus = Math.max(0, Math.min(this.labels().length - 1, this.focus + amount));
                if (focus !== this.focus) {
                    this.focusMotion = { from: this.focusPosition(this.now()), to: focus, started: this.now() };
                    this.focus = focus;
                }
            }
        } else if (action === 'center') {
            if (!this.menu) this.openMenu();
            else this.select();
        } else if (action === 'back') {
            if (['help', 'confirm', 'scores'].indexOf(this.menu) >= 0) this.openMenu();
            else if (this.menu === 'pause') this.menu = null;
            else this.openMenu();
        } else if (!this.menu && ['up', 'down', 'left', 'right'].indexOf(action) >= 0) {
            const score = this.game.score;
            if (this.game.move(action)) {
                this.animation = { started: this.now(), move: this.game.lastMove };
                const gain = this.game.score - score;
                if (gain) this.scoreFeedback = { amount: gain, started: this.now() + SLIDE_MS };
                this.save();
            }
        }
        this.changed();
    }
    select() {
        const label = this.labels()[this.focus];
        this.pressFeedback = { menu: this.menu, focus: this.focus, started: this.now() };
        this.focusMotion = null;
        if (label === 'Resume') this.menu = null;
        else if (label === 'Keep playing') { this.game.continued = true; this.menu = null; this.save(); if (this.game.over()) this.openMenu(); }
        else if (label === 'New game') this.openMenu('confirm');
        else if (label === 'Cancel' || label === 'Back to menu') this.openMenu();
        else if (label === 'Start new game') { this.game.newGame(); leaderboard.newRun(this.arcade); this.animation = null; this.scoreFeedback = null; this.menu = null; this.save(); }
        else if (label === 'High scores') this.openMenu('scores');
        else if (label === 'Save current score' || label === 'Save score') this.enterInitials(this.menu === 'over' ? 'over' : 'scores');
        else if (label === 'How to play') this.openMenu('help');
        else if (label === 'Exit app') { this.save(); this.visible = false; this.last = null; if (this.opts.exit) this.opts.exit(); }
    }
    ccu(e) {
        if (!this.visible) { this.last = null; return; }
        const last = this.last;
        e = Object.assign({}, e);
        if (last) {
            if (e.press !== 0 && e.press !== 1 && e.press !== 2) e.press = last.press;
            if (e.tilt !== 0 && !TILT[e.tilt]) e.tilt = last.tilt;
        }
        this.last = e;
        // The first sample seeds held buttons and the knob, without triggering an action.
        if (!last) return;
        const pressed = e.press === 1 || e.press === 2, wasPressed = last.press === 1 || last.press === 2;
        if (pressed && !wasPressed) { this.input('center'); return; }
        const dir = TILT[e.tilt];
        if (dir && dir !== TILT[last.tilt]) this.input(dir);
        if (e.knob !== 65535 && last.knob !== 65535) {
            const d = ((e.knob - last.knob + 32768) & 65535) - 32768;
            if (d && Math.abs(d) <= 24) this.input('rotate', d);
        }
    }
}
module.exports = { Session, TILT, SLIDE_MS, POP_MS, ANIMATION_MS, FOCUS_MS, PRESS_MS, SCORE_MS };
