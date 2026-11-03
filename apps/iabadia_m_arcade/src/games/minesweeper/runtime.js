// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const model = require('./model.js'),
    board = require('./board.js');
const { Runtime, moduleFor } = require('../../core/runtime.js');
class Adapter extends Runtime {
    constructor(mode, saved, services) {
        super(model.Game, board, mode, saved, services);
    }
    static validExtra(e) {
        return Object.keys(e).length === 0;
    }
    actions() {
        return ['Reveal', 'Flag', 'Menu'].map((label, i) => ({
            label,
            selected: this.mode === i,
        }));
    }
    input(a) {
        if (a.type === 'wheel')
            this.mode = (((this.mode + a.steps) % 3) + 3) % 3;
        else if (a.type === 'tilt') this.game.move(a.direction);
        else if (a.type === 'center') {
            if (this.mode === 2) return { pause: true };
            const changed =
                this.mode === 1
                    ? this.game.flag(this.game.cursor)
                    : this.game.reveal(this.game.cursor);
            if (changed)
                this.pulse = {
                    cell: this.game.cursor,
                    started: this.services.now(),
                };
        }
        return { dirty: true, checkpoint: true };
    }
    update(dt) {
        if (this.game.status === 'playing') this.game.elapsed += dt;
        if (this.pulse && this.services.now() - this.pulse.started >= 160)
            this.pulse = null;
        return { dirty: this.phase() === 'playing' || !!this.pulse };
    }
    animating() {
        return this.phase() === 'playing' || !!this.pulse;
    }
    scoreCandidate() {
        return this.phase() === 'won'
            ? { boardId: this.game.level, value: Math.floor(this.game.elapsed) }
            : undefined;
    }
    hud() {
        const g = this.game,
            sec = Math.floor(g.elapsed / 1000);
        return [
            {
                label: 'Mines',
                value: String(g.spec.mines - g.flags.filter(Boolean).length),
            },
            {
                label: 'Time',
                value:
                    Math.floor(sec / 60) +
                    ':' +
                    String(sec % 60).padStart(2, '0'),
            },
        ];
    }
}
module.exports = moduleFor(model, Adapter);
