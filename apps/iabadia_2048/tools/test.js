// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Game, slide, valid } = require('../src/game.js');
const { Session } = require('../src/session.js');
const storage = require('../src/storage.js');
const { png } = require('./preview.js');
let count = 0;
function test(name, fn) { fn(); count++; console.log('ok ' + name); }
const board = (a) => a.concat(Array(16 - a.length).fill(0));
test('pairs merge once, in movement order; score is the merged values', () => {
    let r = slide(board([2, 2, 2, 2]), 'left'); assert.deepStrictEqual(r.board.slice(0, 4), [4, 4, 0, 0]); assert.strictEqual(r.score, 8);
    r = slide(board([2, 2, 4, 0]), 'right'); assert.deepStrictEqual(r.board.slice(0, 4), [0, 0, 4, 4]); assert.strictEqual(r.score, 4);
    r = slide(board([4, 0, 4, 4]), 'left'); assert.deepStrictEqual(r.board.slice(0, 4), [8, 4, 0, 0]);
});
test('vertical moves preserve columns', () => {
    let r = slide([2, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0], 'up');
    assert.deepStrictEqual(r.board, [4, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    r = slide(r.board, 'down'); assert.strictEqual(r.board[8], 4); assert.strictEqual(r.board[12], 8);
});
test('invalid moves do not spawn or change the score', () => {
    let calls = 0; const g = new Game(null, () => { calls++; return 0; }); g.board = board([2, 4]);
    const before = calls; assert.strictEqual(g.move('left'), false); assert.strictEqual(calls, before); assert.strictEqual(g.score, 0);
    assert.strictEqual(g.move('right'), true); assert.strictEqual(calls, before + 2);
});
test('win, continue, loss and best score', () => {
    const g = new Game(null, () => 0); g.board = board([1024, 1024]); g.move('left');
    assert(g.won()); assert.strictEqual(g.score, 2048); assert.strictEqual(g.best, 2048); assert(!g.move('down'));
    g.continued = true; assert(g.move('down')); g.newGame(); assert.strictEqual(g.best, 2048);
    g.board = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]; assert(g.over());
    g.board[15] = 4; assert(!g.over());
});
test('paused board ignores tilts and wheel selects menu items', () => {
    const s = new Session(null, { random: () => 0 }); s.visibility(true); s.input('center');
    const before = s.game.snapshot(); s.input('right'); assert.deepStrictEqual(s.game.snapshot(), before);
    s.input('rotate', 1); s.input('center'); assert.strictEqual(s.menu, 'confirm'); assert.strictEqual(s.focus, 0);
    s.input('center'); assert.strictEqual(s.menu, 'pause'); s.input('center'); assert.strictEqual(s.menu, null);
});
test('new game is confirmed, and exit saves and disables input', () => {
    let saved, exited = 0; const s = new Session(null, { save: (v) => { saved = v; }, exit: () => exited++ });
    s.visibility(true); s.game.score = 100; s.game.best = 100; s.input('center'); s.input('rotate', 1); s.input('center');
    s.input('rotate', 1); s.input('center'); assert.strictEqual(s.game.score, 0); assert.strictEqual(s.game.best, 100);
    s.input('center'); s.input('rotate', 4); s.input('center'); assert.strictEqual(exited, 1); assert.deepStrictEqual(saved, s.snapshot());
    s.input('center'); assert(!s.visible);
});
test('controller held short-to-long tilt and push do not repeat', () => {
    const s = new Session(null, { random: () => 0 }); s.visibility(true); s.game.board = board([2]);
    const e = (tilt, press, knob, seq) => s.ccu({ tilt, press, knob: knob || 0, seq: seq || 0 });
    e(0, 0); e(4, 0); const after = s.game.snapshot(); e(5, 0); e(5, 0, 0, 8);
    assert.deepStrictEqual(s.game.snapshot(), after);
    e(0, 1); assert.strictEqual(s.menu, 'pause'); e(0, 2); assert.strictEqual(s.menu, 'pause');
    e(0, 0, 1); assert.strictEqual(s.focus, 1); e(0, 0, 65535); e(0, 0, 0); assert.strictEqual(s.focus, 1);
});
test('wheel wraparound and focus loss reset held input', () => {
    const s = new Session(null); s.visibility(true); s.input('center');
    s.ccu({ knob: 65534, press: 0, tilt: 0 }); s.ccu({ knob: 0, press: 0, tilt: 0 }); assert.strictEqual(s.focus, 2);
    s.visibility(false); const snapshot = s.game.snapshot(); s.input('left'); assert.deepStrictEqual(s.game.snapshot(), snapshot);
    s.visibility(true); s.ccu({ knob: 8, press: 1, tilt: 4 }); assert.strictEqual(s.menu, 'pause'); assert.strictEqual(s.focus, 0);
});
test('atomic saved game restores and corrupt saves are rejected', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), '2048-test-')), file = path.join(dir, 'data', '2048.json');
    try {
        const g = new Game(null); storage.save(file, g.snapshot()); assert.deepStrictEqual(storage.load(file), g.snapshot());
        assert.deepStrictEqual(new Game(storage.load(file)).snapshot(), g.snapshot());
        fs.writeFileSync(file, '{broken'); assert.strictEqual(storage.load(file), null);
        const bad = g.snapshot(); bad.board[0] = 3; assert(!valid(bad)); assert.throws(() => storage.save(file, bad));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('every menu and game renders an actual PNG', () => {
    const s = new Session(null); s.visibility(true);
    [null, 'pause', 'confirm', 'help', 'won', 'over'].forEach((menu) => { s.menu = menu; const data = png(s); assert.strictEqual(data.toString('hex', 0, 8), '89504e470d0a1a0a'); assert.strictEqual(data.readUInt32BE(16), 1280); });
});
test('animation tracks both source tiles into each merged destination', () => {
    const source = board([2, 0, 2, 2]);
    const r = slide(source, 'left');
    assert.deepStrictEqual(r.moves, [{ from: 0, to: 0, value: 2 }, { from: 2, to: 0, value: 2 }, { from: 3, to: 1, value: 2 }]);
    assert.deepStrictEqual(r.merged, [0]);
    ['left', 'right', 'up', 'down'].forEach((d) => {
        const result = slide(source, d);
        assert.strictEqual(result.moves.length, 3);
        result.moves.forEach((m) => { assert.strictEqual(m.value, source[m.from]); assert(m.to >= 0 && m.to < 16); });
    });
});
test('slide, merge pop and spawn render distinct frames without changing saved state', () => {
    let time = 1000, saved;
    const s = new Session(null, { now: () => time, random: () => 0, save: (v) => { saved = v; } });
    s.visibility(true); s.game.board = board([2, 0, 2]); s.input('left');
    assert.strictEqual(saved.board[0], 4); assert.strictEqual(saved.board[1], 2);
    const result = s.game.snapshot(), frames = [];
    [1000, 1060, 1120, 1190, 1260].forEach((t) => { time = t; frames.push(png(s)); assert.deepStrictEqual(s.game.snapshot(), result); });
    frames.slice(1).forEach((f, i) => assert(!f.equals(frames[i])));
    assert.strictEqual(s.animation, null);
    time = 1800; png(s); assert(!s.animating());
});
test('rapid moves stay responsive, invalid moves preserve motion, pause cancels it', () => {
    let time = 1000; const s = new Session(null, { now: () => time, random: () => 0 });
    s.visibility(true); s.game.board = board([2, 0, 2]); s.input('left');
    const first = s.animation; s.input('left'); assert.strictEqual(s.animation, first);
    time = 1060; s.input('down'); assert.notStrictEqual(s.animation, first); assert.strictEqual(s.animation.started, time);
    s.input('center'); assert.strictEqual(s.menu, 'pause'); assert.strictEqual(s.animation, null);
    s.input('center'); s.input('up'); assert(s.animating()); s.visibility(false); assert(!s.animating());
});
test('winning move completes its animation before opening the win menu', () => {
    let time = 1000; const s = new Session(null, { now: () => time, random: () => 0 });
    s.visibility(true); s.game.board = board([1024, 1024]); s.input('left');
    assert(s.game.won()); assert.strictEqual(s.menu, null); png(s); assert.strictEqual(s.menu, null);
    time = 1260; png(s); assert.strictEqual(s.menu, 'won');
});
test('Resume is first; Back unwinds help and confirmation without changing the board', () => {
    const s = new Session(null); s.visibility(true); const before = s.game.snapshot();
    s.input('center'); assert.deepStrictEqual(s.labels(), ['Resume', 'New game', 'High scores', 'How to play', 'Exit app']);
    s.input('rotate', 3); s.input('center'); assert.strictEqual(s.menu, 'help');
    s.input('back'); assert.strictEqual(s.menu, 'pause'); assert.strictEqual(s.focus, 0);
    s.input('rotate', 1); s.input('center'); assert.strictEqual(s.menu, 'confirm');
    assert.strictEqual(s.labels()[s.focus], 'Cancel'); s.input('back'); assert.strictEqual(s.menu, 'pause');
    s.input('back'); assert.strictEqual(s.menu, null); assert.deepStrictEqual(s.game.snapshot(), before);
});
test('wheel focus retargets smoothly and clamps at menu edges', () => {
    let time = 1000; const s = new Session(null, { now: () => time }); s.visibility(true); s.input('center');
    s.input('rotate', 1); assert.strictEqual(s.focusPosition(time), 0);
    time += 60; const middle = s.focusPosition(time); assert(middle > 0 && middle < 1);
    s.input('rotate', 1); assert.strictEqual(s.focusPosition(time), middle); assert.strictEqual(s.focus, 2);
    time += 120; s.advance(); assert.strictEqual(s.focusPosition(time), 2);
    s.input('rotate', 100); assert.strictEqual(s.focus, 4); s.input('rotate', -100); assert.strictEqual(s.focus, 0);
});
test('press feedback finishes while Resume takes effect immediately', () => {
    let time = 1000; const s = new Session(null, { now: () => time }); s.visibility(true); s.input('center');
    s.input('center'); assert.strictEqual(s.menu, null); assert(s.pressFeedback); const pressed = png(s);
    time += 90; const settled = png(s); assert(!pressed.equals(settled)); assert(!s.pressFeedback); assert(!s.animating());
});
test('merge feedback displays the exact gained score and fades out', () => {
    let time = 1000; const s = new Session(null, { now: () => time, random: () => 0 });
    s.visibility(true); s.game.board = board([2, 2, 4, 4]); s.input('left');
    assert.strictEqual(s.scoreFeedback.amount, 12); assert.strictEqual(s.game.score, 12);
    time = 1300; const feedback = png(s); assert(s.scoreFeedback);
    time = 1800; const settled = png(s); assert(!feedback.equals(settled)); assert.strictEqual(s.scoreFeedback, null);
    s.game.board = board([2, 2]); s.input('left'); s.input('center'); assert.strictEqual(s.scoreFeedback, null);
});
test('up/down and wheel navigate the same menu without moving the board', () => {
    const s = new Session(null); s.visibility(true); s.input('center'); const before = s.game.snapshot();
    s.input('down'); assert.strictEqual(s.focus, 1); s.input('rotate', 1); assert.strictEqual(s.focus, 2);
    s.input('up'); assert.strictEqual(s.focus, 1); s.input('up'); assert.strictEqual(s.focus, 0);
    s.input('up'); assert.strictEqual(s.focus, 0); assert.deepStrictEqual(s.game.snapshot(), before);
});
test('initials use wheel, arrows and center; confirming the third letter saves', () => {
    const s = new Session(null); s.visibility(true); s.game.score = 128; s.game.best = 128; s.enterInitials('scores');
    s.input('rotate', -1); assert.strictEqual(s.arcade.draft.name, 'ZAA');
    s.input('center'); assert.strictEqual(s.arcade.draft.cursor, 1);
    s.input('up'); s.input('right'); s.input('rotate', 2); assert.strictEqual(s.arcade.draft.name, 'ZBC');
    s.input('left'); s.input('down'); s.input('center'); s.input('center');
    assert.strictEqual(s.menu, 'scores'); assert.strictEqual(s.arcade.scores[0].name, 'ZAC');
    assert.strictEqual(s.arcade.scores[0].score, 128); assert.strictEqual(s.arcade.draft, null);
});
test('leaderboard keeps five ranked scores, rejects a full-table tie, and updates the same run', () => {
    const lb = require('../src/leaderboard.js'), a = lb.create();
    [100, 300, 200, 500, 400, 50].forEach((score) => { lb.record(a, 'AAA', score); lb.newRun(a); });
    assert.deepStrictEqual(a.scores.map((s) => s.score), [500, 400, 300, 200, 100]);
    assert(!lb.qualifies(a, 100)); assert(lb.qualifies(a, 101));
    lb.record(a, 'BOB', 600); assert.strictEqual(a.scores.length, 5); assert(!lb.qualifies(a, 600));
    lb.record(a, 'BOB', 700); assert.strictEqual(a.scores.filter((s) => s.name === 'BOB').length, 1);
    assert.strictEqual(a.scores[0].score, 700); assert(lb.validArcade(a));
});
test('legacy saves migrate; leaderboard and unfinished initials survive a file reload', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), '2048-arcade-')), file = path.join(dir, 'save.json');
    try {
        const legacy = new Game(null).snapshot(); storage.save(file, legacy);
        const s = new Session(storage.load(file), { save: (v) => storage.save(file, v) }); s.visibility(true);
        assert.deepStrictEqual(s.game.snapshot(), legacy); s.game.score = 256; s.game.best = 256;
        s.enterInitials('scores'); s.input('rotate', 1); s.input('center');
        const restored = new Session(storage.load(file), { save: (v) => storage.save(file, v) }); restored.visibility(true);
        assert.strictEqual(restored.menu, 'initials'); assert.strictEqual(restored.arcade.draft.name, 'BAA');
        assert.strictEqual(restored.arcade.draft.cursor, 1); restored.input('center'); restored.input('center');
        const reopened = new Session(storage.load(file)); assert.strictEqual(reopened.arcade.scores[0].name, 'BAA');
        assert.strictEqual(reopened.arcade.scores[0].score, 256);
        const bad = reopened.snapshot(); bad.arcade.scores[0].name = '<X>'; assert.throws(() => storage.save(file, bad));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('qualifying game over prompts once, supports cancel, and retains the draft on focus loss', () => {
    const s = new Session(null); s.visibility(true); s.game.score = 512; s.game.best = 512;
    s.game.board = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]; s.openMenu();
    assert.strictEqual(s.menu, 'initials'); s.input('rotate', 2); s.visibility(false); s.visibility(true);
    assert.strictEqual(s.arcade.draft.name, 'CAA'); assert.strictEqual(s.menu, 'initials');
    s.input('back'); assert.strictEqual(s.menu, 'over'); s.openMenu(); assert.strictEqual(s.menu, 'over');
    assert.strictEqual(s.arcade.scores.length, 0);
});
test('failed score writes keep the initials editor available for retry', () => {
    let fail = false; const s = new Session(null, { save: () => { if (fail) throw Error('disk full'); } });
    s.visibility(true); s.game.score = 64; s.game.best = 64; s.enterInitials('scores');
    s.input('center'); s.input('center'); fail = true; s.input('center');
    assert.strictEqual(s.menu, 'initials'); assert.strictEqual(s.arcade.scores.length, 0); assert(s.notice);
    assert.strictEqual(s.arcade.draft.cursor, 2); fail = false; s.input('center');
    assert.strictEqual(s.menu, 'scores'); assert.strictEqual(s.arcade.scores.length, 1);
});
test('high-score and initials screens render with a full table', () => {
    const lb = require('../src/leaderboard.js'), s = new Session(null); s.visibility(true);
    [100, 200, 300, 400, 500].forEach((v) => { lb.record(s.arcade, 'AAA', v); lb.newRun(s.arcade); });
    s.game.score = 600; s.game.best = 600; s.openMenu('scores'); assert(png(s).length > 1000);
    s.enterInitials('scores'); assert(png(s).length > 1000);
});
console.log(count + ' tests passed');
