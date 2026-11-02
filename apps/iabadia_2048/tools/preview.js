// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs = require('fs');
const path = require('path');
const { Session } = require('../src/session.js');
const { draw, WIDTH, HEIGHT } = require('../src/draw.js');
const { Canvas } = require('../src/kit_canvas.js');
const { play } = require('../src/kit_record.js');
function png(session) { return play(draw(session).words(), new Canvas(WIDTH, HEIGHT)).png(); }
function samples() {
    const s = new Session(null); s.visibility(true);
    s.game.board = [2, 4, 8, 16, 0, 2, 4, 32, 0, 0, 8, 64, 0, 0, 0, 128];
    s.game.score = 1268; s.game.best = 6240;
    const out = path.join(__dirname, '../preview');
    if (!fs.existsSync(out)) fs.mkdirSync(out);
    fs.writeFileSync(path.join(out, 'game.png'), png(s));
    s.input('center'); fs.writeFileSync(path.join(out, 'pause.png'), png(s));
    s.input('rotate', 1); s.input('center'); fs.writeFileSync(path.join(out, 'confirm.png'), png(s));
    s.input('back'); s.input('rotate', 3); s.input('center'); fs.writeFileSync(path.join(out, 'help.png'), png(s));
    const leaderboard = require('../src/leaderboard.js');
    [{ name: 'INA', score: 6240 }, { name: 'MAX', score: 4096 }, { name: 'BMW', score: 2048 }].forEach((entry) => {
        leaderboard.record(s.arcade, entry.name, entry.score); leaderboard.newRun(s.arcade);
    });
    s.openMenu('scores'); fs.writeFileSync(path.join(out, 'scores.png'), png(s));
    s.enterInitials('scores'); s.arcade.draft.name = 'INA'; s.arcade.draft.cursor = 1;
    fs.writeFileSync(path.join(out, 'initials.png'), png(s));
    const tree = require('../mgu-app.json').tree;
    fs.copyFileSync(path.join(__dirname, '../assets/icon.png'), path.join(__dirname, '..', tree, 'rhmiData/variantGroups/Common/images/iabadia_2048_icon.png'));
    console.log(out);
}
module.exports = { png };
if (require.main === module) samples();
