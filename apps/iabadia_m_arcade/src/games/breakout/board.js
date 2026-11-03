// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const { Recorder } = require('../../kit/kit_record.js');
const { LEVELS, W, H, R, PADDLE_Y, brickBox } = require('./model.js');
const WIDTH = 1280,
    HEIGHT = 480;
const COLORS = [
    '#e5888e',
    '#eaa875',
    '#e7ce86',
    '#92c7a1',
    '#85b9d8',
    '#b49bcf',
];
function draw(s, now) {
    now = now === undefined ? s.now() : now;
    const g = s.game,
        r = new Recorder(WIDTH, HEIGHT),
        bx = 475,
        by = 38;
    r.clear('#000000');
    r.roundRect(bx - 6, by - 6, W + 12, H + 12, 6, '#252a30');
    r.fillRect(bx, by, W, H, '#0b1016');
    g.bricks.forEach((v) => {
        const p = brickBox(v),
            c = COLORS[v.row];
        r.roundRect(bx + p.x, by + p.y, p.w, p.h, 2, c);
        r.line(
            bx + p.x + 3,
            by + p.y + 2,
            bx + p.x + p.w - 4,
            by + p.y + 2,
            1,
            [255, 255, 255, 85],
        );
        if (v.hp === 2)
            r.line(
                bx + p.x + 4,
                by + p.y + p.h - 3,
                bx + p.x + p.w - 4,
                by + p.y + p.h - 3,
                2,
                '#49434d',
            );
    });
    g.trail.forEach((v, i) =>
        r.circle(bx + v.x, by + v.y, 2 + i / 5, [
            200,
            222,
            240,
            Math.round((i / g.trail.length) * 100),
        ]),
    );
    g.effects.forEach((v) =>
        r.roundRect(bx + v.x, by + v.y, v.w, v.h, 2, [
            255,
            255,
            255,
            Math.round(170 * (1 - (g.time - v.at) / 180)),
        ]),
    );
    r.roundRect(
        bx + g.paddle - g.width / 2,
        by + PADDLE_Y,
        g.width,
        10,
        4,
        '#80b7de',
    );
    r.line(
        bx + g.paddle - g.width / 2 + 6,
        by + PADDLE_Y + 2,
        bx + g.paddle + g.width / 2 - 6,
        by + PADDLE_Y + 2,
        1,
        '#c6e2f5',
    );
    if (!g.ended()) r.circle(bx + g.ball.x, by + g.ball.y, R, '#fff3dc');
    if (!s.menu && g.status === 'ready') {
        r.roundRect(bx + 130, by + 230, 500, 64, 5, [0, 0, 0, 225]);
        r.text('Turn the wheel to start', bx + 380, by + 270, 26, '#ffffff', {
            font: 'bold',
            align: 'center',
        });
    } else if (!s.menu && g.serve > 0)
        r.text('Launching...', bx + W / 2, by + H - 58, 21, '#bdbdc3', {
            align: 'center',
        });
    return r;
}
module.exports = { draw, WIDTH, HEIGHT };
