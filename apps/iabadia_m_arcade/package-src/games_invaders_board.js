// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const { Recorder } = require('./kit_kit_record.js');
const { LEVELS, W, H, SHIP_Y } = require('./games_invaders_model.js');
const WIDTH = 1280,
    HEIGHT = 480;
const SPRITES = [
    [
        '00100100',
        '00011000',
        '01111110',
        '11011011',
        '11111111',
        '00100100',
        '01000010',
        '10000001',
    ],
    [
        '00111100',
        '01111110',
        '11011011',
        '11111111',
        '10111101',
        '10000001',
        '01000010',
        '00100100',
    ],
];
const SHIP = [
    '00011000',
    '00011000',
    '00111100',
    '01111110',
    '11111111',
    '11111111',
    '11100111',
];
function sprite(r, rows, x, y, scale, color) {
    rows.forEach((line, j) => {
        for (let i = 0; i < line.length; i++) {
            if (line[i] !== '1') continue;
            const start = i;
            while (i + 1 < line.length && line[i + 1] === '1') i++;
            r.fillRect(
                x + (start - 4) * scale,
                y + (j - 4) * scale,
                (i - start + 1) * scale,
                scale,
                color,
            );
        }
    });
}
function draw(s, now) {
    now = now === undefined ? s.now() : now;
    const g = s.game,
        r = new Recorder(WIDTH, HEIGHT),
        bx = 475,
        by = 38;
    r.clear('#000000');
    r.roundRect(bx - 6, by - 6, W + 12, H + 12, 6, '#252a30');
    r.fillRect(bx, by, W, H, '#090d12');
    for (let i = 0; i < 30; i++)
        r.fillRect(
            bx + ((i * 113 + 47) % W),
            by + ((i * 73 + 19) % (H - 45)),
            1,
            1,
            '#34404d',
        );
    const frame = Math.floor(g.time / 350) % 2;
    g.enemies.forEach((e) =>
        sprite(
            r,
            SPRITES[(frame + e.row) % 2],
            bx + e.x,
            by + e.y,
            3,
            ['#b8a2de', '#8cc9e5', '#8cc9e5', '#8fd3ac', '#8fd3ac'][e.row],
        ),
    );
    g.shields.forEach((v) =>
        r.fillRect(
            bx + v.x,
            by + v.y,
            7,
            7,
            v.hp === 2 ? '#5a9985' : '#365c51',
        ),
    );
    g.bullets.forEach((v) => {
        const x = bx + v.x,
            y = by + v.y;
        if (v.enemy) {
            r.line(x - 2, y - 5, x + 2, y, 2, '#f19a83');
            r.line(x + 2, y, x - 2, y + 5, 2, '#f19a83');
        } else r.fillRect(x - 1, y - 5, 3, 10, '#ece5cf');
    });
    if (
        !g.ended() &&
        (!g.immune ||
            Math.floor(g.time / 110) % 2 === 0 ||
            g.status === 'ready')
    )
        sprite(r, SHIP, bx + g.player, by + SHIP_Y, 3, '#88d7bb');
    g.effects.forEach((v) => {
        const t = (g.time - v.at) / 230,
            size = 5 + t * 13,
            c = [245, 190, 121, Math.round(230 * (1 - t))];
        r.line(
            bx + v.x - size,
            by + v.y - size,
            bx + v.x + size,
            by + v.y + size,
            2,
            c,
        );
        r.line(
            bx + v.x - size,
            by + v.y + size,
            bx + v.x + size,
            by + v.y - size,
            2,
            c,
        );
    });
    r.line(bx, by + H - 9, bx + W, by + H - 9, 1, '#34483f');
    if (!s.menu && g.status === 'ready') {
        r.roundRect(bx + 130, by + 207, 500, 66, 5, [0, 0, 0, 230]);
        r.text(
            'Turn the wheel to defend Earth',
            bx + 380,
            by + 248,
            25,
            '#ffffff',
            { font: 'bold', align: 'center' },
        );
    }
    return r;
}
module.exports = { draw, WIDTH, HEIGHT };
