// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs = require('fs'),
    path = require('path'),
    { decode } = require('./png.js'),
    { makeImage } = require('../kit/kit_record.js');
function loadIcons(dir, definitions) {
    const images = {};
    definitions.forEach((def) => {
        const p = decode(fs.readFileSync(path.join(dir, def.icon)));
        images[def.id] = makeImage(p.w, p.h, p.data);
    });
    return images;
}
module.exports = { loadIcons };
