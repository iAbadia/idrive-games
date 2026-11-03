// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const model = require('./games_2048_model.js'),
    board = require('./games_2048_board.js');
const { Runtime, moduleFor } = require('./core_runtime.js');
class Adapter extends Runtime {
    constructor(mode, saved, services) {
        super(model.Game, board, mode, saved, services);
        this.animation = null;
    }
    static validExtra(e) {
        return Object.keys(e).length === 0;
    }
    pause() {
        this.animation = null;
    }
    canContinue() {
        return this.phase() === 'won';
    }
    input(a) {
        if (a.type === 'continue') {
            this.game.continued = true;
            return { checkpoint: true };
        }
        if (a.type === 'tilt' && this.game.move(a.direction)) {
            this.animation = {
                started: this.services.now(),
                move: this.game.lastMove,
            };
            return { dirty: true, checkpoint: true };
        }
        return {};
    }
    update() {
        if (
            this.animation &&
            this.services.now() - this.animation.started >= 260
        )
            this.animation = null;
        return { dirty: !!this.animation };
    }
    phase() {
        return this.game.won() ? 'won' : this.game.over() ? 'lost' : 'playing';
    }
    animating() {
        return !!this.animation;
    }
    hud() {
        return [
            { label: 'Score', value: String(this.game.score) },
            { label: 'Best', value: String(this.game.best) },
        ];
    }
}
module.exports = moduleFor(model, Adapter);
