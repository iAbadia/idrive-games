// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const { Recorder } = require('./kit_kit_record.js'),
    { games } = require('./core_registry.js'),
    t = require('./ui_theme.js');
function text(r, s, x, y, size, color, opts) {
    r.text(s, x, y, size || 23, color || t.text, opts || {});
}
function title(r, s, sub) {
    text(r, s, 42, 57, 33, t.text, { font: 'bold' });
    if (sub) text(r, sub, 42, 91, 19, t.muted);
}
function library(s, icons) {
    const r = new Recorder(t.width, t.height),
        selected = games[s.selected];
    r.clear(t.bg);
    title(r, 'M Arcade', 'Choose your next game');
    text(
        r,
        String(s.selected + 1).padStart(2, '0') +
            ' / ' +
            String(games.length).padStart(2, '0'),
        1236,
        57,
        23,
        t.muted,
        { font: 'num', align: 'right' },
    );
    // Draw back to front. Repeated logical indices make the seam feel like any other turn.
    const position = s.carousel.position(s.now()),
        cards = [];
    for (
        let slot = Math.floor(position) - 3;
        slot <= Math.ceil(position) + 3;
        slot++
    ) {
        const offset = slot - position,
            distance = Math.abs(offset);
        if (distance > 2.65) continue;
        const index = ((slot % games.length) + games.length) % games.length;
        cards.push({ offset, distance, index });
    }
    cards
        .sort((a, b) => b.distance - a.distance)
        .forEach((card) => {
            const { offset, distance, index } = card,
                g = games[index];
            const scale = 1 - Math.min(2.65, distance) * 0.18;
            const w = 268 * scale,
                h = 232 * scale,
                x = 640 + offset * 263,
                cy = 220 + distance * 12;
            const left = x - w / 2,
                top = cy - h / 2,
                emphasis = Math.max(0, 1 - distance);
            r.roundRect(left, top, w, h, 9, '#101621');
            r.strokeRoundRect(
                left,
                top,
                w,
                h,
                9,
                emphasis > 0 ? 2 : 1,
                emphasis > 0 ? g.accent : '#303743',
            );
            r.fillRect(
                left + 22 * scale,
                top + 9 * scale,
                w - 44 * scale,
                2,
                g.accent,
            );
            if (icons && icons[g.id])
                r.image(
                    icons[g.id],
                    x - 84 * scale,
                    cy - 86 * scale,
                    168 * scale,
                    168 * scale,
                    0,
                );
            if (distance < 0.65)
                text(
                    r,
                    s.saved[g.id] ? 'Resume game' : 'Play game',
                    x,
                    top + h - 15 * scale,
                    18,
                    t.muted,
                    { align: 'center' },
                );
            text(
                r,
                g.title,
                x,
                top + h + 32 * scale,
                20 + 11 * emphasis,
                distance < 0.5 ? t.text : '#9DA2AD',
                { font: 'bold', align: 'center' },
            );
            // Fade the far cards with opaque primitives so native and software rendering agree.
            if (distance > 1.35)
                r.roundRect(left, top, w, h, 9, [
                    0,
                    0,
                    0,
                    Math.round(Math.min(0.6, (distance - 1.35) * 0.5) * 255),
                ]);
        });
    text(r, selected.tagline, 640, 405, 21, t.muted, { align: 'center' });
    const dotsWidth = (games.length - 1) * 20;
    games.forEach((g, i) =>
        r.circle(
            640 - dotsWidth / 2 + i * 20,
            428,
            i === s.selected ? 4 : 3,
            i === s.selected ? selected.accent : '#414651',
        ),
    );
    r.line(42, 448, 1236, 448, 1, t.line);
    text(
        r,
        s.notice || 'Turn the wheel or tilt to choose',
        42,
        472,
        19,
        s.notice ? '#F3B782' : t.muted,
    );
    text(
        r,
        s.saved[selected.id] ? 'Press to resume' : 'Press to play',
        640,
        472,
        19,
        t.text,
        { align: 'center' },
    );
    text(r, 'Back to exit', 1236, 472, 19, t.muted, { align: 'right' });
    return r;
}
function chrome(r, s) {
    const def = s.definition,
        g = s.runtime;
    const x = 42;
    r.fillRect(0, 0, 438, 480, t.bg);
    text(r, 'M Arcade', x, 43, 19, t.muted);
    text(r, def.title, x, 95, def.title.length > 12 ? 31 : 35, t.text, {
        font: 'bold',
    });
    const mode = def.modes.find((m) => m.id === s.envelope.modeId);
    text(r, mode.label, x, 127, 20, def.accent);
    g.hud()
        .slice(0, 2)
        .forEach((v, i) => {
            const hx = x + i * 193;
            text(r, v.label, hx, 184, 19, t.muted);
            text(r, v.value, hx, 225, 33, t.text, { font: 'num' });
        });
    r.line(x, 250, 411, 250, 1, t.line);
    if (g.actions().length) {
        g.actions().forEach((action, i) => {
            const v = action.label;
            const bx = x + i * 123;
            r.roundRect(
                bx,
                276,
                113,
                42,
                4,
                action.selected ? t.selected : t.raised,
            );
            if (action.selected) r.fillRect(bx + 10, 315, 93, 3, t.focus);
            text(r, v, bx + 56, 304, 20, t.text, { align: 'center' });
        });
        text(r, 'Tilt to move · Wheel for action', x, 365, 20, t.muted);
        text(
            r,
            'Press: ' + g.actions().find((a) => a.selected).label,
            x,
            399,
            20,
            t.text,
        );
    } else
        def.controls.help
            .slice(0, 3)
            .forEach((line, i) =>
                text(r, line, x, 297 + i * 34, 20, i ? t.muted : t.text),
            );
    text(
        r,
        s.notice ||
            (def.controls.centerDuringPlay === 'pause'
                ? 'Press to pause · Back to Arcade'
                : 'Back to Arcade'),
        x,
        449,
        18,
        s.notice ? '#F3B782' : t.muted,
    );
}
function time(ms) {
    const secs = Math.floor(ms / 1000);
    return Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
}
function menu(r, s) {
    const def = s.definition,
        kind = s.menu,
        mx = 26,
        my = 18,
        mw = 420;
    r.fillRect(448, 0, 832, 480, [0, 0, 0, 115]);
    r.roundRect(mx, my, mw, 444, 6, t.surface);
    const headings = {
        pause: 'Paused',
        won: def.winTitle || 'You won',
        lost: 'Game over',
        confirm: 'Start a new game?',
        difficulty: 'Difficulty',
        scores:
            def.rankings[0].metric === 'milliseconds'
                ? 'Best times'
                : 'High scores',
        help: 'How to play',
        initials: 'Enter your initials',
    };
    text(r, headings[kind] || 'Paused', mx + 24, my + 45, 29, t.text, {
        font: 'bold',
    });
    if (kind === 'initials') {
        const d = s.envelope.initialsDraft;
        if (!d) return;
        const c = d.candidate;
        const value =
            def.rankings[0].metric === 'milliseconds'
                ? time(c.value)
                : String(c.value) + ' points';
        text(r, value, mx + 24, my + 90, 26, def.accent, { font: 'num' });
        d.name.split('').forEach((v, i) => {
            const x = mx + 30 + i * 120;
            r.roundRect(
                x,
                my + 125,
                108,
                85,
                5,
                i === d.cursor ? t.selected : t.raised,
            );
            if (i === d.cursor) r.fillRect(x + 10, my + 206, 88, 3, t.focus);
            text(r, v, x + 54, my + 185, 44, t.text, {
                font: 'num',
                align: 'center',
            });
        });
        [
            'Wheel or up/down: change letter',
            'Left/right: choose position',
            'Press: next letter; third saves',
        ].forEach((v, i) =>
            text(r, v, mx + 24, my + 265 + i * 31, 19, t.muted),
        );
        text(
            r,
            s.notice || 'Back to cancel',
            mx + 24,
            my + 420,
            17,
            s.notice ? '#F3B782' : t.muted,
        );
        return;
    }
    if (kind === 'confirm')
        text(
            r,
            'Current progress will be replaced.',
            mx + 24,
            my + 94,
            19,
            t.muted,
        );
    if (kind === 'help')
        def.controls.help
            .concat([
                '',
                'Press to select menu options.',
                'Back returns to the parent screen.',
            ])
            .forEach((v, i) =>
                text(r, v, mx + 24, my + 94 + i * 30, 19, t.muted),
            );
    if (kind === 'scores') {
        let y = my + 92;
        def.rankings.forEach((p) => {
            const mode = def.modes.find((m) => m.id === p.id);
            if (def.rankings.length > 1) {
                text(r, mode.label, mx + 24, y, 19, t.muted);
                y += 29;
            }
            const list = s.envelope.records[p.id] || [];
            if (!list.length) {
                text(r, 'No record yet', mx + 24, y, 21, t.muted);
                y += 37;
            } else
                list.forEach((v) => {
                    text(r, v.name || '---', mx + 24, y, 24, t.text, {
                        font: 'num',
                    });
                    text(
                        r,
                        p.metric === 'milliseconds'
                            ? time(v.value)
                            : String(v.value),
                        mx + mw - 24,
                        y,
                        24,
                        def.accent,
                        { font: 'num', align: 'right' },
                    );
                    y += 37;
                });
        });
    }
    const labels = s.labels(),
        start = ['scores', 'help'].includes(kind)
            ? my + 329
            : kind === 'confirm'
              ? my + 215
              : my + 66,
        row = kind === 'scores' ? 42 : labels.length > 6 ? 43 : 48;
    labels.forEach((v, i) => {
        const y = start + i * row;
        if (i === s.focus) {
            r.roundRect(mx + 12, y, mw - 24, row - 5, 4, t.selected);
            r.fillRect(mx + 12, y + 6, 3, row - 17, t.focus);
        }
        text(r, v, mx + 28, y + 28, 22, i === s.focus ? t.text : '#B7BBC5');
    });
    if (s.notice) text(r, s.notice, mx + 24, my + 430, 16, '#F3B782');
}
function draw(s, icons) {
    if (s.route === 'library' || !s.runtime) return library(s, icons);
    const r = s.runtime.render(s.clock, !!s.menu);
    chrome(r, s);
    if (s.menu) menu(r, s);
    return r;
}
module.exports = { draw, library, time, WIDTH: t.width, HEIGHT: t.height };
