// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const { Recorder } = require('./kit_kit_record.js');
const { LEVELS, KINDS, cells } = require('./games_tetris_model.js');
const WIDTH = 1280,
    HEIGHT = 480;
const COLORS = [
    '#161b22',
    '#66d2e8',
    '#6989e0',
    '#eeaa64',
    '#edcf72',
    '#8acb91',
    '#b59bdf',
    '#e78086',
];
function block(r, x, y, n, size, ghost) {
    if (ghost) {
        r.strokeRoundRect(x + 2, y + 2, size - 4, size - 4, 2, 1, COLORS[n]);
        return;
    }
    r.roundRect(x + 1, y + 1, size - 2, size - 2, 2, COLORS[n]);
    r.line(x + 3, y + 2, x + size - 4, y + 2, 1, [255, 255, 255, 100]);
}
function draw(s, now) {
    now = now === undefined ? s.now() : now;
    const g = s.game,
        r = new Recorder(WIDTH, HEIGHT),
        bx = 610,
        by = 20,
        cell = 22;
    r.clear('#000000');
    r.roundRect(bx - 5, by - 5, 230, 450, 5, '#30343c');
    r.fillRect(bx, by, 220, 440, '#101419');
    for (let y = 1; y < 20; y++)
        r.line(bx, by + y * cell, bx + 220, by + y * cell, 1, '#1a2028');
    for (let x = 1; x < 10; x++)
        r.line(bx + x * cell, by, bx + x * cell, by + 440, 1, '#1a2028');
    g.board.forEach((n, i) => {
        if (n)
            block(
                r,
                bx + (i % 10) * cell,
                by + Math.floor(i / 10) * cell,
                n,
                cell,
            );
    });
    if (!g.ended())
        cells(g.ghost()).forEach(([x, y]) => {
            if (y >= 0)
                block(
                    r,
                    bx + x * cell,
                    by + y * cell,
                    KINDS.indexOf(g.piece.kind) + 1,
                    cell,
                    true,
                );
        });
    cells(g.piece).forEach(([x, y]) => {
        if (y >= 0 && y < 20)
            block(
                r,
                bx + x * cell,
                by + y * cell,
                KINDS.indexOf(g.piece.kind) + 1,
                cell,
            );
    });
    if (s.flashUntil > now)
        g.cleared.forEach((y) =>
            r.fillRect(bx, by + y * cell, 220, cell, [
                255,
                255,
                255,
                Math.round((130 * (s.flashUntil - now)) / 180),
            ]),
        );
    r.text('Next', 938, 62, 22, '#a6a6ab');
    g.next.forEach((kind, i) =>
        cells({ kind, rot: 0, x: 0, y: 0 }).forEach(([x, y]) =>
            block(
                r,
                940 + x * 22,
                82 + i * 74 + y * 22,
                KINDS.indexOf(kind) + 1,
                22,
            ),
        ),
    );
    r.text('Level', 938, 342, 20, '#a6a6ab');
    r.text(String(g.stage), 938, 380, 31, '#ffffff', { font: 'num' });
    r.text('Lines', 1080, 342, 20, '#a6a6ab');
    r.text(String(g.lines), 1080, 380, 31, '#ffffff', { font: 'num' });
    if (!s.menu && g.status === 'ready') {
        r.roundRect(526, 195, 390, 81, 5, [0, 0, 0, 235]);
        r.text('Turn the wheel to start', 721, 244, 26, '#ffffff', {
            align: 'center',
            font: 'bold',
        });
    }
    return r;
}
module.exports = { draw, WIDTH, HEIGHT };
