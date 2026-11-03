// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs = require('fs'),
    path = require('path'),
    scores = require('./scores.js');
const MAX = 128 * 1024;
function clone(v) {
    return JSON.parse(JSON.stringify(v));
}
function directory(p) {
    if (fs.existsSync(p)) return;
    const parent = path.dirname(p);
    if (parent !== p) directory(parent);
    try {
        fs.mkdirSync(p, 0o700);
    } catch (e) {
        if (e.code !== 'EEXIST') throw e;
    }
}
function draftValid(d, def) {
    return (
        d === null ||
        (d &&
            /^[A-Z]{3}$/.test(d.name) &&
            Number.isInteger(d.cursor) &&
            d.cursor >= 0 &&
            d.cursor <= 2 &&
            ['pause', 'won', 'lost', 'scores'].includes(d.returnTo) &&
            scores.candidate(def, d.candidate))
    );
}
function valid(def, s) {
    return (
        s &&
        s.envelopeVersion === 1 &&
        s.gameId === def.id &&
        s.stateVersion === def.stateVersion &&
        def.modes.some((m) => m.id === s.modeId) &&
        typeof s.runId === 'string' &&
        s.runId.length > 0 &&
        s.runId.length <= 80 &&
        def.load().validate(s.state, s.stateVersion) &&
        (!s.state.model.level || s.state.model.level === s.modeId) &&
        scores.valid(def, s.records) &&
        draftValid(s.initialsDraft, def) &&
        (!s.initialsDraft || s.initialsDraft.candidate.boardId === s.modeId)
    );
}
function upgrade(def, state) {
    if (valid(def, state)) return state;
    if (
        !state ||
        state.gameId !== def.id ||
        !Number.isInteger(state.stateVersion) ||
        state.stateVersion < 1 ||
        state.stateVersion >= def.stateVersion
    )
        throw Error('Unsupported state version');
    const next = clone(state);
    next.state = def.load().migrate(next.state, next.stateVersion);
    next.stateVersion = def.stateVersion;
    if (!valid(def, next)) throw Error('Invalid migrated state');
    return next;
}
class Saves {
    constructor(dir) {
        this.dir = dir;
        this.recovered = false;
    }
    file(id) {
        if (!/^[a-z0-9_]+$/.test(id)) throw Error('Invalid game ID');
        return path.join(
            this.dir,
            id === 'shell' ? 'shell.json' : 'games/' + id + '.json',
        );
    }
    read(file, validate) {
        if (!fs.existsSync(file)) return null;
        if (fs.statSync(file).size > MAX) throw Error('Save too large');
        const s = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!validate(s)) throw Error('Invalid save');
        return s;
    }
    loadWithBackup(id, validate) {
        this.recovered = false;
        const file = this.file(id);
        try {
            return this.read(file, validate);
        } catch (e) {
            try {
                const s = this.read(file + '.bak', validate);
                if (s) {
                    this.recovered = true;
                    return s;
                }
            } catch (ignored) {}
            throw Error(
                'Saved ' +
                    id +
                    ' data could not be read. Restore a backup before replacing it.',
            );
        }
    }
    has(def) {
        return (
            fs.existsSync(this.file(def.id)) ||
            fs.existsSync(this.file(def.id) + '.bak')
        );
    }
    load(def) {
        const state = this.loadWithBackup(def.id, (s) => {
            try {
                upgrade(def, s);
                return true;
            } catch (e) {
                return false;
            }
        });
        if (!state) return null;
        const next = upgrade(def, state);
        if (next !== state) {
            const file = this.file(def.id);
            this.write(file + '.bak', state);
            this.write(file, next);
        }
        return next;
    }
    shell() {
        return this.loadWithBackup(
            'shell',
            (s) => s && s.version === 1 && typeof s.selected === 'string',
        );
    }
    write(file, s) {
        const data = JSON.stringify(s);
        if (Buffer.byteLength(data) > MAX) throw Error('Save too large');
        directory(path.dirname(file));
        const temp = file + '.tmp',
            fd = fs.openSync(temp, 'w', 0o600);
        try {
            fs.writeFileSync(fd, data);
            fs.fsyncSync(fd);
        } finally {
            fs.closeSync(fd);
        }
        fs.renameSync(temp, file);
    }
    save(def, s) {
        if (!valid(def, s)) throw Error('Invalid save');
        const file = this.file(def.id);
        let old;
        try {
            old = this.read(file, (v) => valid(def, v));
        } catch (e) {}
        if (old) this.write(file + '.bak', old);
        this.write(file, s);
    }
    saveShell(s) {
        this.write(this.file('shell'), s);
    }
}
module.exports = { Saves, valid, clone };
