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
    const r = new Recorder(t.width, t.height);
    r.clear(t.bg);
    title(r, 'M Arcade', 'Choose your next game');
    text(r, games.length + ' games · One controller', 1236, 53, 19, t.muted, {
        align: 'right',
    });
    const page = Math.floor(s.selected / 6);
    games.slice(page * 6, page * 6 + 6).forEach((g, index) => {
        const i = page * 6 + index,
            col = index % 2,
            row = Math.floor(index / 2),
            x = 38 + col * 610,
            y = 110 + row * 106,
            on = i === s.selected;
        r.roundRect(x, y, 594, 96, 6, on ? t.selected : t.surface);
        if (on) r.fillRect(x, y + 12, 4, 72, t.focus);
        if (icons && icons[g.id])
            r.image(icons[g.id], x + 10, y + 3, 90, 90, 0);
        text(r, g.title, x + 113, y + 39, 27, on ? t.text : '#D5D7DC', {
            font: 'bold',
        });
        text(r, g.tagline, x + 113, y + 69, 19, t.muted);
        if (on) {
            text(
                r,
                s.saved[g.id] ? 'Resume' : 'Play',
                x + 565,
                y + 55,
                20,
                t.text,
                { align: 'right' },
            );
        }
    });
    r.line(42, 440, 1236, 440, 1, t.line);
    text(
        r,
        s.notice || 'Wheel to browse · Tilt to navigate · Press to play',
        42,
        469,
        19,
        s.notice ? '#F3B782' : t.muted,
    );
    text(r, 'Back to exit', 1236, 469, 19, t.muted, { align: 'right' });
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
