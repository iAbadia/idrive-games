// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Explicit offline import. Never searches another app UID's private directory.
const fs = require('fs'),
    path = require('path'),
    { games, get } = require('../src/core/registry.js'),
    { Saves, valid } = require('../src/core/saves.js'),
    scores = require('../src/core/scores.js');
const { validArcade } = require('../../iabadia_2048/src/leaderboard.js');
const FILES = {
    2048: '2048.json',
    minesweeper: 'Minesweeper.json',
    snake: 'Snake.json',
    tetris: 'Tetris.json',
    invaders: 'Invaders.json',
    breakout: 'Breakout.json',
};
function convert(id, legacy) {
    const def = get(id);
    if (!def) throw Error('Unknown game');
    const model = require('../src/games/' + id + '/model.js');
    if (!model.valid(legacy)) throw Error('Invalid legacy ' + id + ' state');
    if (
        id === '2048' &&
        legacy.arcade !== undefined &&
        !validArcade(legacy.arcade)
    )
        throw Error('Invalid legacy leaderboard');
    const mode = legacy.level || 'classic',
        runtime = def
            .load()
            .create(
                mode,
                { model: legacy, extra: {} },
                { now: () => 0, random: () => 0.47 },
            ),
        a = legacy.arcade,
        runId =
            'legacy-' + id + '-' + (id === '2048' && a ? a.runId : 'current');
    const env = {
        envelopeVersion: 1,
        gameId: id,
        stateVersion: 1,
        modeId: mode,
        runId,
        state: runtime.snapshot(),
        records: {},
        initialsDraft: null,
    };
    if (id === '2048' && a) {
        env.records.classic = a.scores.map((v) => ({
            runId: 'legacy-2048-' + v.id,
            name: v.name,
            value: v.score,
        }));
        if (a.draft)
            env.initialsDraft = {
                name: a.draft.name,
                cursor: a.draft.cursor,
                candidate: { boardId: 'classic', value: legacy.score },
                returnTo: a.draft.returnTo === 'over' ? 'lost' : 'scores',
            };
        env.promptedValue = a.promptedScore;
    } else if (id !== '2048') {
        def.modes.forEach((m) => {
            const value = legacy.best[m.id];
            if (
                value === null ||
                value === undefined ||
                (id !== 'minesweeper' && value === 0)
            )
                return;
            const current =
                m.id === mode &&
                runtime.scoreCandidate() &&
                Math.floor(runtime.scoreCandidate().value) ===
                    Math.floor(value) &&
                ['won', 'lost'].includes(runtime.phase());
            env.records[m.id] = [
                {
                    runId: current ? runId : 'legacy-' + id + '-' + m.id,
                    name: (legacy.names && legacy.names[m.id]) || null,
                    value: Math.floor(value),
                },
            ];
        });
        const c = runtime.scoreCandidate();
        if (
            c &&
            ['won', 'lost'].includes(runtime.phase()) &&
            scores.qualifies(def, env.records, runId, c)
        )
            env.initialsDraft = {
                name: 'AAA',
                cursor: 0,
                candidate: c,
                returnTo: runtime.phase(),
            };
    }
    runtime.dispose();
    if (!valid(def, env))
        throw Error('Legacy state cannot be converted safely');
    return env;
}
function importDirectory(source, destination) {
    const from = path.resolve(source),
        to = path.resolve(destination);
    if (from === to || to.startsWith(from + path.sep))
        throw Error('Output must be separate from the source exports');
    const store = new Saves(to),
        result = [];
    // Validate every input before writing any output.
    const pending = [];
    games.forEach((def) => {
        const file = path.join(from, FILES[def.id]);
        if (!fs.existsSync(file)) return;
        if (store.has(def)) {
            result.push(def.id + ': existing M Arcade save kept');
            return;
        }
        if (fs.statSync(file).size > 128 * 1024)
            throw Error('Oversized legacy save');
        pending.push([
            def,
            convert(def.id, JSON.parse(fs.readFileSync(file, 'utf8'))),
        ]);
    });
    pending.forEach(([def, env]) => {
        store.save(def, env);
        result.push(def.id + ': imported');
    });
    return result;
}
module.exports = { convert, importDirectory, FILES };
if (require.main === module) {
    try {
        const args = process.argv.slice(2),
            src = args[args.indexOf('--source') + 1],
            out = args[args.indexOf('--output') + 1];
        if (
            !args.includes('--source') ||
            !args.includes('--output') ||
            !src ||
            !out ||
            src.startsWith('--') ||
            out.startsWith('--')
        )
            throw Error(
                'Usage: node tools/import_saves.js --source <exported-JSON-folder> --output <new-m-arcade-folder>',
            );
        console.log(
            importDirectory(src, out).join('\n') ||
                'No matching exported saves found.',
        );
    } catch (e) {
        console.error(e.message);
        process.exitCode = 1;
    }
}
