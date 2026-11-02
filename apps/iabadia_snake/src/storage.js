// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs = require('fs'), path = require('path');
const { valid } = require('./game.js');
function load(file) { try { if (fs.statSync(file).size > 32768) return null; const s = JSON.parse(fs.readFileSync(file, 'utf8')); return valid(s) ? s : null; } catch (e) { return null; } }
function save(file, state) {
    if (!valid(state)) throw new Error('Invalid save');
    if (!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file));
    const tmp = file + '.tmp', fd = fs.openSync(tmp, 'w', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(state)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(tmp, file);
}
module.exports = { load, save };
