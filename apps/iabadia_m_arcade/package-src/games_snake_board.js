// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const { Recorder } = require('./kit_kit_record.js');
const { LEVELS, COLS, ROWS } = require('./games_snake_model.js');
const WIDTH = 1280,
    HEIGHT = 480;
function draw(s, now) {
    now = now === undefined ? s.now() : now;
    const g = s.game,
        r = new Recorder(WIDTH, HEIGHT),
        bx = 487,
        by = 32,
        cell = 26;
    r.clear('#000000');
    r.roundRect(
        bx - 6,
        by - 6,
        COLS * cell + 12,
        ROWS * cell + 12,
        6,
        '#292d2b',
    );
    r.fillRect(bx, by, COLS * cell, ROWS * cell, '#101714');
    for (let y = 1; y < ROWS; y++)
        r.line(
            bx,
            by + y * cell,
            bx + COLS * cell,
            by + y * cell,
            1,
            '#17201b',
        );
    for (let x = 1; x < COLS; x++)
        r.line(
            bx + x * cell,
            by,
            bx + x * cell,
            by + ROWS * cell,
            1,
            '#17201b',
        );
    if (g.food !== null) {
        const fx = bx + ((g.food % COLS) + 0.5) * cell,
            fy = by + (Math.floor(g.food / COLS) + 0.5) * cell;
        // Blocky red apple, matching the launcher artwork; kept inside its grid cell.
        r.roundRect(fx - 9, fy - 5, 18, 12, 3, '#ed242b');
        r.roundRect(fx - 7, fy - 7, 6, 5, 2, '#ff4245');
        r.roundRect(fx + 1, fy - 7, 6, 5, 2, '#ff4245');
        r.roundRect(fx - 6, fy + 3, 12, 7, 2, '#c91627');
        r.fillRect(fx - 3, fy + 3, 6, 5, '#ed242b');
        r.roundRect(fx - 1, fy - 11, 3, 7, 1, '#94502b');
        r.roundRect(fx + 2, fy - 11, 4, 3, 1, '#56b956');
        r.roundRect(fx + 5, fy - 13, 4, 3, 1, '#9be45c');
        r.roundRect(fx - 5, fy - 4, 3, 3, 1, '#ffc0a2');
        r.fillRect(fx - 7, fy - 1, 2, 3, '#ff7970');
    }
    g.snake
        .slice()
        .reverse()
        .forEach((n, i) => {
            const head = i === g.snake.length - 1,
                x = bx + (n % COLS) * cell,
                y = by + Math.floor(n / COLS) * cell;
            r.roundRect(
                x + 1,
                y + 1,
                cell - 2,
                cell - 2,
                head ? 7 : 4,
                head ? '#a1ebba' : '#4eac7b',
            );
            if (head) {
                const points = [
                    [
                        [7, 7],
                        [18, 7],
                    ],
                    [
                        [18, 7],
                        [18, 18],
                    ],
                    [
                        [7, 18],
                        [18, 18],
                    ],
                    [
                        [7, 7],
                        [7, 18],
                    ],
                ][g.dir];
                points.forEach((p) =>
                    r.circle(x + p[0], y + p[1], 2.5, '#10261b'),
                );
            }
        });
    if (!s.menu && g.status === 'ready') {
        r.roundRect(bx + 124, by + 167, 480, 82, 6, [0, 0, 0, 225]);
        r.text('Turn the wheel to start', bx + 364, by + 218, 28, '#ffffff', {
            align: 'center',
            font: 'bold',
        });
    }
    return r;
}
module.exports = { draw, WIDTH, HEIGHT };
