// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const path = require('path'),
    fs = require('fs');
const { draw, WIDTH, HEIGHT } = require('../src/ui/draw.js');
const { Canvas } = require('../src/kit/kit_canvas.js'),
    { play } = require('../src/kit/kit_record.js');
const { loadIcons } = require('../src/ui/icons.js'),
    { games } = require('../src/core/registry.js');
const icons = loadIcons(path.join(__dirname, '../assets/games'), games);
function png(s) {
    return play(draw(s, icons).words(), new Canvas(WIDTH, HEIGHT)).png();
}
module.exports = { png, icons };
if (require.main === module) {
    const { Session } = require('../src/core/session.js'),
        { Saves } = require('../src/core/saves.js');
    const dir = fs.mkdtempSync(
        path.join(require('os').tmpdir(), 'm-arcade-preview-'),
    );
    const s = new Session({ store: new Saves(dir), random: () => 0.47 });
    s.visibility(true);
    const out = path.join(__dirname, '../preview');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'library.png'), png(s));
    s.activate('breakout');
    s.input('rotate', 1);
    fs.writeFileSync(path.join(out, 'game.png'), png(s));
    s.input('center');
    fs.writeFileSync(path.join(out, 'menu.png'), png(s));
    console.log(out);
}
