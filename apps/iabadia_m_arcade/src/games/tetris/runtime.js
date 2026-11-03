// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const model = require('./model.js'),
    board = require('./board.js');
const { Runtime, moduleFor } = require('../../core/runtime.js');
class Adapter extends Runtime {
    constructor(mode, saved, services) {
        super(model.Game, board, mode, saved, services);
        this.flashUntil = 0;
    }
    static validExtra(e) {
        return (
            ['fall', 'lock', 'resets'].every(
                (k) => Number.isFinite(e[k]) && e[k] >= 0,
            ) &&
            e.fall <= 1000 &&
            e.lock <= 500 &&
            Number.isInteger(e.resets) &&
            e.resets <= 10
        );
    }
    restore(e) {
        ['fall', 'lock', 'resets'].forEach((k) => (this.game[k] = e[k] || 0));
    }
    extra() {
        return {
            fall: this.game.fall,
            lock: this.game.lock,
            resets: this.game.resets,
        };
    }
    input(a) {
        const locked = this.game.action(
            a.type === 'wheel' ? 'rotate' : a.direction,
            a.steps,
        );
        if (locked) this.flashUntil = this.services.now() + 180;
        return { dirty: true, checkpoint: true };
    }
    hud() {
        return [
            { label: 'Score', value: String(this.game.score) },
            { label: 'Lines', value: String(this.game.lines) },
        ];
    }
}
module.exports = moduleFor(model, Adapter);
