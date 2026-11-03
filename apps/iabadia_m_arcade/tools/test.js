// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    os = require('os'),
    vm = require('vm');
const { Session } = require('../src/core/session.js'),
    { games, get } = require('../src/core/registry.js'),
    { Saves, valid, clone } = require('../src/core/saves.js'),
    scores = require('../src/core/scores.js');
const { draw } = require('../src/ui/draw.js'),
    { png, icons } = require('./preview.js');
let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log('ok ' + name);
}
class Memory {
    constructor() {
        this.data = {};
        this.fail = false;
    }
    shell() {
        return this.data.shell || null;
    }
    has(d) {
        return !!this.data[d.id];
    }
    load(d) {
        return this.data[d.id] ? clone(this.data[d.id]) : null;
    }
    save(d, s) {
        if (this.fail) throw Error('disk unavailable');
        assert(valid(d, s));
        this.data[d.id] = clone(s);
    }
    saveShell(s) {
        if (this.fail) throw Error('disk unavailable');
        this.data.shell = clone(s);
    }
}
function harness(store) {
    let now = 1000;
    const s = new Session({
        store: store || new Memory(),
        now: () => now,
        random: () => 0.47,
    });
    s.visibility(true);
    return {
        s,
        step(ms) {
            now += ms;
            s.advance(now);
        },
        store: s.store,
    };
}
function select(s, label) {
    const n = s.labels().indexOf(label);
    assert(n >= 0, label + ' missing from ' + s.labels());
    s.focus = n;
    s.input('center');
}
function name(s) {
    assert.equal(s.menu, 'initials');
    s.input('rotate', 1);
    s.input('center');
    s.input('rotate', 2);
    s.input('center');
    s.input('rotate', 3);
    s.input('center');
}

test('library owns wheel/tilt input; center opens the selected module', () => {
    const { s } = harness();
    s.input('down');
    assert.equal(s.selected, 2);
    s.input('rotate', 3);
    assert.equal(s.selected, 5);
    s.input('center');
    assert.equal(s.definition.id, 'breakout');
    assert.equal(s.game.status, 'ready');
    assert.equal(s.targetDepth(), 2);
});
test('all six games have valid independent snapshots and pure rendering', () => {
    const { s, step } = harness();
    for (const def of games) {
        assert(s.activate(def.id));
        const initial = JSON.stringify(s.runtime.snapshot());
        const r = draw(s, icons);
        assert(r.words().length > 100);
        assert.equal(JSON.stringify(s.runtime.snapshot()), initial);
        for (let i = 0; i < 35; i++) {
            s.input('rotate', i % 2 ? 1 : -1);
            s.input(['left', 'right', 'up', 'down'][i % 4]);
            step(35);
            if (s.menu) break;
            assert(def.load().validate(s.runtime.snapshot(), 1));
        }
        s.input('center');
        assert(png(s).length > 1000);
        assert(s.leave());
        assert.equal(s.runtime, null);
        assert.equal(s.route, 'library');
    }
});
test('switches dispose old runtimes and never simulate inactive games', () => {
    const { s, step } = harness();
    s.activate('breakout');
    s.input('rotate', 1);
    step(50);
    const old = s.runtime,
        snapshot = JSON.stringify(old.snapshot());
    assert(s.leave());
    s.activate('tetris');
    s.input('rotate', 1);
    step(100);
    assert(old.disposed);
    assert.equal(JSON.stringify(old.snapshot()), snapshot);
    s.leave();
    s.activate('breakout');
    assert.equal(s.menu, 'pause');
    assert.equal(JSON.stringify(s.runtime.snapshot()), snapshot);
});
test('pause, focus loss and long stalls do not advance hidden physics', () => {
    const { s, step } = harness();
    s.activate('breakout');
    s.input('rotate', 1);
    step(50);
    s.input('center');
    let before = clone(s.game.snapshot());
    step(60000);
    assert.deepEqual(s.game.snapshot(), before);
    s.input('center');
    step(10000);
    assert(s.game.time - before.time <= 50);
    s.visibility(false);
    before = clone(s.game.snapshot());
    step(5000);
    s.visibility(true);
    assert.equal(s.menu, 'pause');
    assert.deepEqual(s.game.snapshot(), before);
});
test('native Back matches Library -> Game -> Menu -> Detail routes', () => {
    const { s } = harness();
    s.activate('snake');
    s.input('center');
    assert.equal(s.targetDepth(), 3);
    select(s, 'How to play');
    assert.equal(s.targetDepth(), 4);
    s.nativeBack(3);
    assert.equal(s.menu, 'pause');
    s.nativeBack(2);
    assert.equal(s.menu, null);
    s.nativeBack(1);
    assert.equal(s.route, 'library');
    assert.equal(s.runtime, null);
});
test('Minesweeper keeps center reveal/flag, wheel toolbar and safe first click', () => {
    const { s } = harness();
    s.activate('minesweeper');
    s.input('center');
    assert.equal(s.game.status, 'playing');
    assert(s.game.revealed[0]);
    assert(!s.game.mines.includes(0));
    s.input('rotate', 1);
    assert.equal(s.runtime.mode, 1);
    s.input('rotate', 1);
    s.input('center');
    assert.equal(s.menu, 'pause');
    s.input('down');
    assert.equal(s.focus, 1);
    s.input('rotate', 1);
    assert.equal(s.focus, 2);
});
test('Snake queues relative wheel turns and persists pending turns/step time', () => {
    const { s, step } = harness();
    s.activate('snake');
    s.input('rotate', 1);
    assert.equal(s.game.queue[0], 2);
    step(40);
    const snapshot = clone(s.runtime.snapshot());
    s.leave();
    s.activate('snake');
    assert.deepEqual(s.runtime.snapshot(), snapshot);
    s.resume();
    step(100);
    step(20);
    assert.equal(s.game.dir, 2);
});
test('Tetris restores its gravity and lock countdowns', () => {
    const { s, step } = harness();
    s.activate('tetris');
    s.input('rotate', 1);
    step(70);
    const expected = clone(s.runtime.snapshot());
    assert(expected.extra.fall > 0);
    s.leave();
    s.activate('tetris');
    assert.deepEqual(s.runtime.snapshot(), expected);
});
test('2048 move/merge animation runs once; repeated renders never advance it', () => {
    const { s, step } = harness();
    s.activate('2048');
    s.game.board = [2, 2, 0, 0, ...Array(12).fill(0)];
    s.input('left');
    assert.equal(s.game.score, 4);
    assert(s.runtime.animation);
    const a = JSON.stringify(s.runtime.snapshot());
    draw(s, icons);
    draw(s, icons);
    assert.equal(JSON.stringify(s.runtime.snapshot()), a);
    step(100);
    step(100);
    step(60);
    assert(!s.runtime.animation);
});
test('2048 keeps a top five, stable ties and one updatable entry per run', () => {
    const d = get('2048'),
        records = {};
    [100, 300, 200, 500, 400].forEach((v, i) =>
        scores.record(
            d,
            records,
            'r' + i,
            { boardId: 'classic', value: v },
            'AAA',
        ),
    );
    assert.deepEqual(
        records.classic.map((v) => v.value),
        [500, 400, 300, 200, 100],
    );
    assert(
        !scores.qualifies(d, records, 'new', {
            boardId: 'classic',
            value: 100,
        }),
    );
    scores.record(d, records, 'r0', { boardId: 'classic', value: 600 }, 'BOB');
    scores.record(d, records, 'r0', { boardId: 'classic', value: 600 }, 'BOB');
    assert.equal(records.classic.length, 5);
    assert.equal(records.classic[0].name, 'BOB');
});
test('other games keep one record per mode; Minesweeper ranks shortest winning time', () => {
    for (const d of games.filter((g) => g.id !== '2048')) {
        const records = {},
            mode = d.defaultMode,
            c = { boardId: mode, value: d.id === 'minesweeper' ? 4200 : 42 };
        scores.record(d, records, 'one', c, 'ACE');
        assert(!scores.qualifies(d, records, 'two', c));
        assert(
            scores.qualifies(d, records, 'two', {
                boardId: mode,
                value: d.id === 'minesweeper' ? 4100 : 43,
            }),
        );
        assert.equal(records[mode].length, 1);
    }
    const { s } = harness();
    s.activate('minesweeper');
    assert.equal(s.runtime.scoreCandidate(), undefined);
    s.game.status = 'lost';
    assert.equal(s.runtime.scoreCandidate(), undefined);
});
test('initials, cursor and qualifying draft survive exit/reload; third press saves', () => {
    const { s, store } = harness();
    s.activate('breakout');
    s.game.score = 120;
    s.enterInitials('scores');
    s.input('rotate', 1);
    s.input('right');
    assert(s.leave());
    const { s: restored } = harness(store);
    restored.activate('breakout');
    assert.equal(restored.menu, 'initials');
    assert.equal(restored.envelope.initialsDraft.name, 'BAA');
    assert.equal(restored.envelope.initialsDraft.cursor, 1);
    restored.input('rotate', 2);
    restored.input('center');
    restored.input('rotate', 3);
    restored.input('center');
    assert.equal(restored.envelope.records.classic[0].name, 'BCD');
    assert.equal(restored.menu, 'scores');
});
test('new game and mode replacement preserve all records', () => {
    const { s } = harness();
    s.activate('breakout');
    s.game.score = 90;
    s.enterInitials('scores');
    name(s);
    select(s, 'Back to menu');
    select(s, 'Difficulty');
    select(s, 'Fast');
    select(s, 'Start new game');
    assert.equal(s.envelope.modeId, 'fast');
    assert.equal(s.envelope.records.classic[0].value, 90);
    assert.equal(s.game.score, 0);
});
test('failed saves block leaving/reset; native Back retains a retryable snapshot', () => {
    const { s, store } = harness();
    s.activate('breakout');
    s.input('rotate', 1);
    const runtime = s.runtime;
    store.fail = true;
    assert(!s.leave());
    assert.strictEqual(s.runtime, runtime);
    assert.equal(s.menu, 'pause');
    s.pendingMode = 'fast';
    s.newGame();
    assert.strictEqual(s.runtime, runtime);
    s.nativeBack(1);
    assert.equal(s.route, 'library');
    assert(s.pendingLeave);
    s.input('rotate', 1);
    assert.strictEqual(s.runtime, runtime);
    store.fail = false;
    s.input('center');
    assert(!s.pendingLeave);
    assert.equal(s.runtime, null);
    assert(store.data.breakout);
});
test('failed record save keeps the draft editable and does not commit a partial record', () => {
    const { s, store } = harness();
    s.activate('breakout');
    s.game.score = 50;
    s.enterInitials('lost');
    s.envelope.initialsDraft.cursor = 2;
    store.fail = true;
    s.input('center');
    assert.equal(s.menu, 'initials');
    assert(!s.envelope.records.classic);
    store.fail = false;
    s.input('center');
    assert.equal(s.envelope.records.classic[0].name, 'AAA');
});
test('app exit disposes the active game; reopening starts at the library', () => {
    const { s } = harness();
    s.activate('breakout');
    const runtime = s.runtime;
    assert(s.exit());
    assert(runtime.disposed);
    s.visibility(true);
    assert.equal(s.route, 'library');
    assert.equal(s.runtime, null);
});
test('controller wraparound, named events and held short/long samples are deduplicated', () => {
    const { s } = harness();
    s.ccu({ knob: 65534, press: 0, tilt: 0 });
    s.ccu({ knob: 0, press: 0, tilt: 0 });
    assert.equal(s.selected, 2);
    s.ccu({ knob: 0, press: 'PRESSED', tilt: 0 });
    assert.equal(s.definition.id, 'snake');
    s.ccu({ knob: 0, press: 2, tilt: 0 });
    assert.equal(s.menu, null);
    s.ccu({ knob: 0, press: 2, tilt: 0 });
    assert.equal(s.menu, null);
    s.ccu({ knob: 0, press: 0, tilt: 0 });
    s.ccu({ knob: 0, press: 0, tilt: 'NORTH' });
    assert.equal(s.game.status, 'playing');
    s.visibility(false);
    s.ccu({ knob: 10, press: 1, tilt: 10 });
    s.visibility(true);
    s.ccu({ knob: 11, press: 1, tilt: 10 });
    assert.equal(s.menu, 'pause');
});
test('atomic real-file saves recover last-good backup and isolate corruption', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'm-arcade-save-test-')),
        store = new Saves(dir),
        { s } = harness(store);
    s.activate('breakout');
    s.input('rotate', 1);
    s.checkpoint();
    s.leave();
    const file = store.file('breakout');
    fs.writeFileSync(file, '{broken');
    const recovered = store.load(get('breakout'));
    assert(valid(get('breakout'), recovered));
    assert(store.recovered);
    assert(!store.load(get('snake')));
    fs.writeFileSync(file + '.bak', '{also broken');
    assert.throws(() => store.load(get('breakout')), /could not be read/);
    assert(!store.load(get('2048')));
});
test('invalid extra state, records and cross-mode drafts are rejected', () => {
    const { s } = harness();
    s.activate('snake');
    const good = clone(s.envelope),
        bad = clone(good);
    bad.state.extra.queue = [9];
    assert(!valid(get('snake'), bad));
    bad.state = good.state;
    bad.records = { classic: [null] };
    assert(!valid(get('snake'), bad));
    bad.records = {};
    bad.initialsDraft = {
        name: 'AAA',
        cursor: 0,
        returnTo: 'scores',
        candidate: { boardId: 'fast', value: 3 },
    };
    assert(!valid(get('snake'), bad));
});
test('all shipped PNG icons decode with true transparent exterior and cache identity', () => {
    assert.equal(Object.keys(icons).length, 6);
    for (const icon of Object.values(icons)) {
        assert.equal(icon.w, 140);
        assert.equal(icon.h, 140);
        assert.equal(icon.data[3], 0);
    }
    assert.throws(
        () => require('../src/ui/png').decode(Buffer.from('bad')),
        /Invalid/,
    );
    const library = draw(harness().s, icons);
    assert.equal(library.images.size, 6);
});
test('source packaging namespaces same-basename modules and preserves static dependencies', () => {
    const { rewrite, generate } = require('./build.js');
    assert.equal(
        rewrite(
            "// require('x')\nconst a=require('../a.js');",
            (n) => './mapped.js',
        ),
        "// require('x')\nconst a=require('./mapped.js');",
    );
    assert.throws(() => rewrite('require(variable)', (n) => n), /Dynamic/);
    const m = generate();
    assert(m.modules.includes('package-src/games_snake_model.js'));
    assert(m.modules.includes('package-src/games_tetris_model.js'));
    m.modules.forEach(
        (f) =>
            new vm.Script(
                fs.readFileSync(path.join(__dirname, '..', f), 'utf8'),
            ),
    );
    const bundled = require('../package-src/core_registry.js');
    assert.equal(bundled.games.length, 6);
    for (const def of bundled.games) {
        const module = def.load(),
            r = module.create(def.defaultMode, undefined, {
                now: () => 0,
                random: () => 0.47,
            });
        assert(module.validate(r.snapshot(), 1));
    }
});
test('offline import preserves all legacy score policies, boards and 2048 drafts', () => {
    const { convert } = require('./import_saves.js');
    for (const def of games) {
        const m = require('../src/games/' + def.id + '/model.js'),
            g = new m.Game(undefined, () => 0.47);
        if (def.id === '2048') {
            g.score = 80;
            g.best = 80;
            const legacy = g.snapshot();
            legacy.arcade = {
                scores: [{ id: 3, name: 'ACE', score: 100 }],
                runId: 4,
                nextId: 5,
                submittedScore: 0,
                promptedScore: 0,
                draft: { name: 'BCD', cursor: 2, returnTo: 'scores' },
            };
            const e = convert(def.id, legacy);
            assert.equal(e.records.classic[0].name, 'ACE');
            assert.equal(e.initialsDraft.name, 'BCD');
            assert.equal(e.runId, 'legacy-2048-4');
        } else {
            const level = g.level;
            g.best[level] = def.id === 'minesweeper' ? 12345 : 40;
            g.names[level] = 'ACE';
            const legacy = g.snapshot(),
                e = convert(def.id, legacy);
            assert.equal(e.records[level][0].name, 'ACE');
            assert.equal(e.records[level][0].value, g.best[level]);
            assert(valid(def, e));
        }
    }
});
test('import is repeatable, leaves source files untouched and never replaces existing progress', () => {
    const { convert, importDirectory } = require('./import_saves.js'),
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'm-arcade-import-')),
        source = path.join(dir, 'source'),
        out = path.join(dir, 'output');
    fs.mkdirSync(source);
    const g = new (require('../src/games/snake/model.js').Game)(
            undefined,
            () => 0.47,
        ),
        file = path.join(source, 'Snake.json'),
        legacy = JSON.stringify(g.snapshot());
    fs.writeFileSync(file, legacy);
    assert.equal(importDirectory(source, out).length, 1);
    const saved = fs.readFileSync(path.join(out, 'games/snake.json'), 'utf8');
    assert(importDirectory(source, out)[0].includes('kept'));
    assert.equal(
        fs.readFileSync(path.join(out, 'games/snake.json'), 'utf8'),
        saved,
    );
    assert.equal(fs.readFileSync(file, 'utf8'), legacy);
    assert.throws(
        () => importDirectory(source, path.join(source, 'bad')),
        /separate/,
    );
    assert.throws(() => convert('snake', {}), /Invalid/);
});
test('version upgrades make a backup and validate the migrated state before committing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'm-arcade-upgrade-')),
        store = new Saves(dir),
        { s } = harness(store);
    s.activate('snake');
    s.leave();
    const original = get('snake'),
        module = original.load(),
        next = Object.assign({}, original, {
            stateVersion: 2,
            load: () => ({
                validate: (v, version) =>
                    version === 2 && module.validate(v, 1),
                migrate: (v, from) => {
                    assert.equal(from, 1);
                    return clone(v);
                },
            }),
        });
    const upgraded = store.load(next);
    assert.equal(upgraded.stateVersion, 2);
    assert.equal(
        JSON.parse(fs.readFileSync(store.file('snake') + '.bak', 'utf8'))
            .stateVersion,
        1,
    );
    assert.equal(
        JSON.parse(fs.readFileSync(store.file('snake'), 'utf8')).stateVersion,
        2,
    );
});
test('2048 finishes the winning animation, saves initials and continues the same run', () => {
    const { s, step } = harness();
    s.activate('2048');
    s.game.board = [1024, 1024, 0, 0, ...Array(12).fill(0)];
    s.input('left');
    assert.equal(s.menu, null);
    step(100);
    step(100);
    step(60);
    assert.equal(s.menu, 'initials');
    const run = s.envelope.runId;
    name(s);
    select(s, 'Back to menu');
    assert.equal(s.menu, 'won');
    select(s, 'Keep playing');
    assert.equal(s.menu, null);
    assert(s.game.continued);
    assert.equal(s.envelope.runId, run);
    assert.equal(s.envelope.records.classic[0].value, 2048);
});
test('a winning Minesweeper reveal opens shared initials and records the winning time', () => {
    const { s, step } = harness();
    s.activate('minesweeper');
    s.input('center');
    const g = s.game;
    g.elapsed = 12345;
    const safe = g.revealed.findIndex((v, i) => !v && !g.mines.includes(i));
    g.revealed = g.revealed.map((v, i) => !g.mines.includes(i) && i !== safe);
    g.cursor = safe;
    s.input('center');
    assert.equal(g.status, 'won');
    step(160);
    assert.equal(s.menu, 'initials');
    name(s);
    assert.equal(s.envelope.records.beginner[0].value, 12345);
    assert.equal(s.envelope.records.beginner[0].name, 'BCD');
});
test('unknown preview actions are ignored and timer completion cannot consume menu input', () => {
    const { s, step } = harness();
    s.activate('2048');
    s.input('unknown');
    s.input('rotate', NaN);
    s.game.board = [1024, 1024, 0, 0, ...Array(12).fill(0)];
    s.input('left');
    s.clock += 300;
    s.input('rotate', 1);
    assert.equal(s.menu, 'initials');
    assert.equal(s.envelope.initialsDraft.name, 'AAA');
});
test('font budget keeps the merge-pop atlas without the unused large title atlas',()=>{const fonts=require('../src/kit/kit_fonts.js'),face=require('../src/kit/font_semibold.js');assert.equal(fonts.get('num',49).size,58);assert(!face.sizes.some(v=>v.size===103));});
console.log(passed + ' M Arcade integration tests passed');
