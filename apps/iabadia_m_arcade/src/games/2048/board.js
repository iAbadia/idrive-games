// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const { Recorder } = require('../../kit/kit_record.js');
const SLIDE_MS = 120,
    POP_MS = 140,
    SCORE_MS = 650;
const WIDTH = 1280,
    HEIGHT = 480;
const COLORS = {
    0: '#303033',
    2: '#eee4da',
    4: '#ede0c8',
    8: '#f2b179',
    16: '#f59563',
    32: '#f67c5f',
    64: '#f65e3b',
    128: '#edcf72',
    256: '#edcc61',
    512: '#edc850',
    1024: '#edc53f',
    2048: '#edc22e',
};
function draw(session, now) {
    now = now === undefined ? session.now() : now;

    const r = new Recorder(WIDTH, HEIGHT),
        g = session.game;
    r.clear('#000000');
    const bx = 652,
        by = 26,
        side = 428,
        pad = 10,
        gap = 10,
        cell = 94.5;
    r.roundRect(bx, by, side, side, 8, '#202023');
    const position = (i) => ({
        x: bx + pad + (i % 4) * (cell + gap),
        y: by + pad + Math.floor(i / 4) * (cell + gap),
    });
    function tile(v, x, y, scale) {
        scale = scale === undefined ? 1 : scale;
        if (scale <= 0) return;
        const size = cell * scale,
            inset = (cell - size) / 2;
        r.roundRect(
            x + inset,
            y + inset,
            size,
            size,
            5 * scale,
            COLORS[v] || '#3c3a32',
        );
        if (v)
            r.text(
                String(v),
                x + cell / 2,
                y + cell / 2 + 14 * scale,
                (v < 100 ? 43 : v < 1000 ? 36 : v < 10000 ? 29 : 23) * scale,
                v <= 4
                    ? '#615b53'
                    : v <= 16
                      ? '#533d2c'
                      : v >= 128 && v <= 2048
                        ? '#514322'
                        : '#ffffff',
                { font: 'num', align: 'center' },
            );
    }
    g.board.forEach((v, i) => {
        const p = position(i);
        tile(0, p.x, p.y);
    });
    const animation = !session.menu && session.animation;
    const elapsed = animation ? Math.max(0, now - animation.started) : Infinity;
    if (animation && elapsed < SLIDE_MS) {
        const progress = 1 - Math.pow(1 - elapsed / SLIDE_MS, 3);
        animation.move.moves.forEach((m) => {
            const from = position(m.from),
                to = position(m.to);
            tile(
                m.value,
                from.x + (to.x - from.x) * progress,
                from.y + (to.y - from.y) * progress,
            );
        });
    } else
        g.board.forEach((v, i) => {
            if (!v) return;
            const p = position(i),
                progress = Math.min(1, (elapsed - SLIDE_MS) / POP_MS);
            const scale = !animation
                ? 1
                : i === animation.move.spawned
                  ? 1 - Math.pow(1 - progress, 3)
                  : animation.move.merged.indexOf(i) >= 0
                    ? 1 + 0.12 * Math.sin(progress * Math.PI)
                    : 1;
            tile(v, p.x, p.y, scale);
        });
    return r;
}
module.exports = { draw, WIDTH, HEIGHT };
