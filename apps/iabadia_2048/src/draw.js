// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const { Recorder } = require('./kit_record.js');
const { SLIDE_MS, POP_MS, PRESS_MS, SCORE_MS } = require('./session.js');
const WIDTH = 1280, HEIGHT = 480;
const COLORS = { 0: '#303033', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
    32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };
function draw(session, now) {
    now = now === undefined ? session.now() : now;
    session.advance(now);
    const r = new Recorder(WIDTH, HEIGHT), g = session.game;
    r.clear('#000000');
    r.text('2048', 196, 126, 78, '#eee4da', { font: 'bold' });
    r.text('Score', 200, 187, 20, '#a6a6ab');
    r.text(String(g.score), 198, 235, 38, '#ffffff', { font: 'num' });
    r.text('Best', 380, 187, 20, '#a6a6ab');
    r.text(String(g.best), 378, 235, 38, '#ffffff', { font: 'num' });
    r.line(200, 267, 510, 267, 1, '#38383c');
    r.text('Tilt to move', 200, 307, 22, '#ceced2');
    r.text('Press to pause', 200, 341, 22, '#a6a6ab');
    if (!session.menu && session.scoreFeedback && now >= session.scoreFeedback.started) {
        const feedback = session.scoreFeedback, p = Math.min(1, (now - feedback.started) / SCORE_MS);
        r.text('+' + feedback.amount, 278, 187 - 16 * p, 22, [237, 207, 114, Math.round(255 * (1 - p))], { font: 'num' });
    }
    if (session.notice) r.text(session.notice, 200, 417, 17, '#f2b179');
    const bx = 652, by = 26, side = 428, pad = 10, gap = 10, cell = 94.5;
    r.roundRect(bx, by, side, side, 8, '#202023');
    const position = (i) => ({ x: bx + pad + (i % 4) * (cell + gap), y: by + pad + Math.floor(i / 4) * (cell + gap) });
    function tile(v, x, y, scale) {
        scale = scale === undefined ? 1 : scale;
        if (scale <= 0) return;
        const size = cell * scale, inset = (cell - size) / 2;
        r.roundRect(x + inset, y + inset, size, size, 5 * scale, COLORS[v] || '#3c3a32');
        if (v) r.text(String(v), x + cell / 2, y + cell / 2 + 14 * scale, (v < 100 ? 43 : v < 1000 ? 36 : v < 10000 ? 29 : 23) * scale,
            v <= 4 ? '#615b53' : v <= 16 ? '#533d2c' : v >= 128 && v <= 2048 ? '#514322' : '#ffffff', { font: 'num', align: 'center' });
    }
    g.board.forEach((v, i) => { const p = position(i); tile(0, p.x, p.y); });
    const animation = !session.menu && session.animation;
    const elapsed = animation ? Math.max(0, now - animation.started) : Infinity;
    if (animation && elapsed < SLIDE_MS) {
        const progress = 1 - Math.pow(1 - elapsed / SLIDE_MS, 3);
        animation.move.moves.forEach((m) => {
            const from = position(m.from), to = position(m.to);
            tile(m.value, from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress);
        });
    } else g.board.forEach((v, i) => {
        if (!v) return;
        const p = position(i), progress = Math.min(1, (elapsed - SLIDE_MS) / POP_MS);
        const scale = !animation ? 1 : i === animation.move.spawned ? 1 - Math.pow(1 - progress, 3) :
            animation.move.merged.indexOf(i) >= 0 ? 1 + 0.12 * Math.sin(progress * Math.PI) : 1;
        tile(v, p.x, p.y, scale);
    });
    const press = session.pressFeedback;
    const closing = !session.menu && press;
    const menu = session.menu || (closing && press.menu);
    if (!menu) return r;
    const opacity = closing ? Math.max(0, 1 - (now - press.started) / PRESS_MS) : 1;
    const color = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, Math.round(opacity * 255)]; };
    // The board stays in place beside the menu; only its brightness changes.
    r.roundRect(bx, by, side, side, 8, [0, 0, 0, Math.round(135 * opacity)]);
    const mx = 176 - (1 - opacity) * 12, mw = 432;
    r.roundRect(mx, by, mw, side, 8, color('#141416'));
    const title = { pause: 'Paused', confirm: 'Start a new game?', help: 'How to play', won: '2048 reached', over: 'Game over', scores: 'High scores', initials: 'Enter your initials' }[menu];
    r.text(title, mx + 28, by + 55, 30, color('#ffffff'), { font: 'bold' });
    if (menu === 'confirm') r.text('This replaces your current game.', mx + 28, by + 100, 20, color('#a6a6ab'));
    if (menu === 'help') {
        ['Tilt left, right, up or down.', 'Matching tiles merge into one.', 'Reach 2048, then keep playing.', '', 'Press the controller to pause.', 'Wheel or up/down to choose.', 'Press to select. Back to return.'].forEach((s, i) =>
            r.text(s, mx + 28, by + 100 + i * 30, 20, color('#ceced2')));
    }
    if (menu === 'initials' && session.arcade.draft) {
        const draft = session.arcade.draft;
        r.text('Score ' + g.score, mx + 28, by + 100, 25, color('#edcf72'), { font: 'num' });
        draft.name.split('').forEach((letter, i) => {
            const x = mx + 50 + i * 114;
            r.roundRect(x, by + 144, 104, 88, 5, color(i === draft.cursor ? '#173953' : '#252528'));
            if (i === draft.cursor) r.fillRect(x + 12, by + 226, 80, 3, color('#59b9ed'));
            r.text(letter, x + 52, by + 207, 52, color('#ffffff'), { align: 'center', font: 'num' });
        });
        ['Wheel or up/down: change letter', 'Left/right: move between letters', 'Press: next letter; third saves'].forEach((s, i) =>
            r.text(s, mx + 28, by + 285 + i * 32, 20, color('#bdbdc3')));
        r.text(session.notice || 'Back to cancel', mx + 28, by + 403, 18, color(session.notice ? '#f2b179' : '#a6a6ab'));
        return r;
    }
    if (menu === 'scores') {
        r.text('Your score ' + g.score, mx + 28, by + 91, 20, color('#a6a6ab'));
        if (!session.arcade.scores.length) r.text('No scores saved yet', mx + 28, by + 170, 23, color('#bdbdc3'));
        session.arcade.scores.forEach((entry, i) => {
            const y = by + 132 + i * 34;
            r.text(String(i + 1), mx + 28, y, 21, color('#a6a6ab'));
            r.text(entry.name, mx + 75, y, 23, color(entry.id === session.arcade.runId ? '#edcf72' : '#ffffff'), { font: 'num' });
            r.text(String(entry.score), mx + mw - 28, y, 23, color('#ffffff'), { font: 'num', align: 'right' });
        });
    }
    const labels = session.labels(menu), start = menu === 'scores' ? by + 308 : menu === 'help' ? by + 328 : menu === 'confirm' ? by + 202 : by + 96;
    const rowH = labels.length >= 5 || menu === 'scores' ? 52 : 66, buttonH = rowH === 52 ? 46 : 56;
    const focus = closing ? press.focus : session.focusPosition(now);
    const selected = closing ? press.focus : session.focus;
    const pressed = press && (closing || press.menu === menu);
    const flash = pressed ? 1 - Math.min(1, (now - press.started) / PRESS_MS) : 0;
    const fy = start + focus * rowH;
    r.roundRect(mx + 16 + flash * 2, fy + flash, mw - 32 - flash * 4, buttonH - flash * 2, 4, color(flash > 0 ? '#245578' : '#173953'));
    r.fillRect(mx + 16 + flash * 2, fy + 8 + flash, 3, buttonH - 16 - flash * 2, color('#59b9ed'));
    labels.forEach((label, i) => {
        r.text(label, mx + 34, start + i * rowH + (rowH === 52 ? 31 : 36), 24, color(selected === i ? '#ffffff' : '#bdbdc3'));
    });
    if (menu !== 'help' && menu !== 'confirm' && menu !== 'scores') {
        r.text('Score ' + g.score, mx + 28, by + 403, 18, color('#a6a6ab'));
        r.text('Best ' + g.best, mx + mw - 28, by + 403, 18, color('#a6a6ab'), { align: 'right' });
    }
    return r;
}
module.exports = { draw, WIDTH, HEIGHT, COLORS };
