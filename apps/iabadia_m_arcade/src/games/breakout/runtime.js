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
    input(a) {
        this.game.steer(a.type === 'wheel' ? 'rotate' : a.direction, a.steps);
        return { dirty: true, checkpoint: true };
    }
    hud() {
        return [
            { label: 'Score', value: String(this.game.score) },
            {
                label: 'Lives / Wave',
                value: this.game.lives + ' / ' + this.game.wave,
            },
        ];
    }
}
module.exports = moduleFor(model, Adapter);
