// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs = require('fs');
const path = require('path');
const { valid } = require('./game.js');
const { validArcade } = require('./leaderboard.js');
const validSave = (s) => valid(s) && (s.arcade === undefined || validArcade(s.arcade));
function load(file) {
    try {
        if (fs.statSync(file).size > 8192) return null;
        const s = JSON.parse(fs.readFileSync(file, 'utf8'));
        return validSave(s) ? s : null;
    } catch (e) { return null; }
}
function save(file, state) {
    if (!validSave(state)) throw new Error('Invalid save');
    const folder = path.dirname(file);
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);
    const tmp = file + '.tmp';
    const fd = fs.openSync(tmp, 'w', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(state)); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    fs.renameSync(tmp, file);
}
module.exports = { load, save };
