// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const { Recorder } = require('./kit_kit_record.js');
const { LEVELS } = require('./games_minesweeper_model.js');
const MODES = ['Reveal', 'Flag', 'Menu'];
const WIDTH = 1280,
    HEIGHT = 480;
const NUMBER = [
    '#c8c8ce',
    '#70bfff',
    '#83d39b',
    '#ff8c7c',
    '#b7a0ff',
    '#f2b179',
    '#65d6d6',
    '#fafafa',
    '#c8c8ce',
];
function time(ms) {
    if (ms === null) return '--:--';
    const sec = Math.floor(ms / 1000);
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
function draw(session, now) {
    now = now === undefined ? session.now() : now;
    const g = session.game,
        d = g.spec,
        r = new Recorder(WIDTH, HEIGHT);
    r.clear('#000000');
    const cell = Math.floor(Math.min(432 / d.rows, 810 / d.cols)),
        w = cell * d.cols,
        h = cell * d.rows;
    const bx = Math.min(1260 - w, Math.round((1280 - w + 420) / 2)),
        by = Math.round((480 - h) / 2),
        gap = cell < 30 ? 2 : 3;
    r.roundRect(bx - 5, by - 5, w + 10, h + 10, 5, '#202023');
    g.revealed.forEach((open, i) => {
        const x = bx + (i % d.cols) * cell,
            y = by + Math.floor(i / d.cols) * cell,
            size = cell - gap,
            mine = g.mines.indexOf(i) >= 0;
        r.roundRect(
            x,
            y,
            size,
            size,
            2,
            open ? (mine ? '#903d33' : '#181b20') : '#343941',
        );
        if (!open) r.line(x + 2, y + 1, x + size - 2, y + 1, 1, '#525863');
        const cx = x + size / 2,
            cy = y + size / 2;
        if ((g.flags[i] || (g.status === 'won' && mine)) && !open) {
            const pole = cx - size * 0.12,
                top = cy - size * 0.27,
                bottom = cy + size * 0.25;
            const width = size * 0.38,
                height = size * 0.28;
            r.line(pole, top, pole, bottom, 2, '#eee4da');
            // Four convex points, the last on the pole, describe a triangular pennant.
            r.quad(
                [
                    [pole, top],
                    [pole + width, top + height / 2],
                    [pole, top + height],
                    [pole, top + height / 2],
                ],
                '#f44747',
            );
            r.line(pole, top, pole + width, top + height / 2, 1, '#ff8c7c');
            r.line(
                pole - size * 0.13,
                bottom,
                pole + size * 0.13,
                bottom,
                2,
                '#eee4da',
            );
            if (g.status === 'lost' && !mine) {
                r.line(x + 4, y + 4, x + size - 4, y + size - 4, 2, '#ff8c7c');
            }
        } else if (mine && (open || g.status === 'lost')) {
            r.circle(cx, cy, size * 0.23, '#eee4da');
            r.line(cx, cy - size * 0.36, cx, cy + size * 0.36, 2, '#eee4da');
            r.line(cx - size * 0.36, cy, cx + size * 0.36, cy, 2, '#eee4da');
        } else if (open && g.count(i))
            r.text(
                String(g.count(i)),
                cx,
                cy + size * 0.27,
                Math.min(30, size * 0.72),
                NUMBER[g.count(i)],
                { font: 'num', align: 'center' },
            );
        if (i === g.cursor)
            r.strokeRoundRect(
                x - 1,
                y - 1,
                size + 2,
                size + 2,
                3,
                2,
                '#59b9ed',
            );
        if (session.pulse && session.pulse.cell === i)
            r.strokeRoundRect(x, y, size, size, 2, 2, [
                255,
                255,
                255,
                Math.round(220 * (1 - (now - session.pulse.started) / 160)),
            ]);
    });
    return r;
}
module.exports = { draw, WIDTH, HEIGHT };
