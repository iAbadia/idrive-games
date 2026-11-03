// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Common adapter mechanics; no filesystem, native SDK, menus or wall-clock timers.
class Runtime {
    constructor(Model, board, mode, saved, services) {
        this.services = services;
        this.board = board;
        this.disposed = false;
        this.mode = 0;
        this.game = new Model(saved && saved.model, services.random);
        if (!saved && this.game.level !== undefined) this.game.newGame(mode);
        this.restore((saved && saved.extra) || {});
    }
    restore() {}
    extra() {
        return {};
    }
    pause() {}
    canContinue() {
        return false;
    }
    actions() {
        return [];
    }
    applyRecords(records, metric) {
        const g = this.game;
        if (typeof g.best === 'number')
            g.best = Math.max(
                g.best,
                g.score,
                ...(records.classic || []).map((v) => v.value),
            );
        else if (g.best)
            Object.keys(g.best).forEach((id) => {
                const record = (records[id] || [])[0];
                g.best[id] = record
                    ? record.value
                    : metric === 'milliseconds'
                      ? null
                      : 0;
                if (g.names) g.names[id] = record ? record.name : null;
            });
    }
    phase() {
        return this.game.status || 'playing';
    }
    update(dt) {
        if (this.phase() !== 'playing') return {};
        return {
            dirty: true,
            checkpoint: !!(this.game.tick && this.game.tick(dt)),
        };
    }
    animating() {
        return this.phase() === 'playing';
    }
    hud() {
        return [{ label: 'Score', value: String(this.game.score || 0) }];
    }
    snapshot() {
        return { model: this.game.snapshot(), extra: this.extra() };
    }
    scoreCandidate() {
        return this.game.score > 0
            ? { boardId: this.game.level || 'classic', value: this.game.score }
            : undefined;
    }
    render(now, paused) {
        this.menu = paused ? 'pause' : null;
        this.now = () => now;
        return this.board.draw(this, now);
    }
    dispose() {
        this.disposed = true;
    }
}
function moduleFor(Model, Adapter) {
    return {
        validate(s, v) {
            return (
                v === 1 &&
                !!s &&
                Model.valid(s.model) &&
                !!s.extra &&
                typeof s.extra === 'object' &&
                !Array.isArray(s.extra) &&
                Adapter.validExtra(s.extra, s.model)
            );
        },
        migrate(s, v) {
            if (v !== 1) throw Error('Unsupported game state version');
            return s;
        },
        create(mode, saved, services) {
            return new Adapter(mode, saved, services);
        },
    };
}
module.exports = { Runtime, moduleFor };
