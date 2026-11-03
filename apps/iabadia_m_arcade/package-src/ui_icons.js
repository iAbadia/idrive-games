// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs = require('fs'),
    path = require('path'),
    { decode } = require('./ui_png.js'),
    { makeImage } = require('./kit_kit_record.js');
function loadIcons(dir, definitions, onError) {
    const images = {};
    definitions.forEach((def) => {
        try {
            const p = decode(fs.readFileSync(path.join(dir, def.icon)));
            images[def.id] = makeImage(p.w, p.h, p.data);
        } catch (error) {
            if (!onError) throw error; // Build and preview remain strict.
            onError(def.id, error);
        }
    });
    return images;
}
module.exports = { loadIcons };
