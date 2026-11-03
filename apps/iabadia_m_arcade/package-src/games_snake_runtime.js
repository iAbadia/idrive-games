// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const model = require('./games_snake_model.js'),
    board = require('./games_snake_board.js');
const { Runtime, moduleFor } = require('./core_runtime.js');
class Adapter extends Runtime {
    constructor(mode, saved, services) {
        super(model.Game, board, mode, saved, services);
    }
    static validExtra(e, model) {
        return (
            Number.isFinite(e.wait) &&
            e.wait >= 0 &&
            e.wait <= 220 &&
            Array.isArray(e.queue) &&
            e.queue.length <= 2 &&
            e.queue.every((n, i) => {
                const prev = i ? e.queue[i - 1] : model.dir;
                return (
                    Number.isInteger(n) &&
                    n >= 0 &&
                    n < 4 &&
                    n !== prev &&
                    n !== (prev + 2) % 4
                );
            })
        );
    }
    restore(e) {
        this.wait = e.wait || 0;
        this.game.queue = (e.queue || []).slice();
    }
    extra() {
        return { wait: this.wait, queue: this.game.queue.slice() };
    }
    input(a) {
        this.game.steer(a.type === 'wheel' ? 'rotate' : a.direction, a.steps);
        return { dirty: true, checkpoint: true };
    }
    update(dt) {
        if (this.phase() !== 'playing') return {};
        this.wait += dt;
        if (this.wait >= model.LEVELS[this.game.level].ms) {
            this.wait = 0;
            this.game.step();
            return { dirty: true, checkpoint: true };
        }
        return {};
    }
    hud() {
        return [
            { label: 'Score', value: String(this.game.score) },
            { label: 'Length', value: String(this.game.snake.length) },
        ];
    }
}
module.exports = moduleFor(model, Adapter);
