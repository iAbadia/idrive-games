// Inter glyph atlases: SIL OFL 1.1 (LICENSE-Inter.txt).
'use strict';
const zlib = require('zlib');
const faces = { regular: require('./font_regular.js'), semibold: require('./font_semibold.js') };
const cache = {};
function get(name, size) {
    const key = ['bold', 'num', 'gear'].indexOf(name) >= 0 ? 'semibold' : 'regular';
    if (!cache[key]) cache[key] = faces[key].sizes.map((s) => {
        const f = Object.assign({}, s); let pixels;
        Object.defineProperty(f, 'alpha', { get: () => pixels || (pixels = zlib.inflateSync(Buffer.from(s.alpha, 'base64'))) });
        return f;
    });
    const sizes = cache[key];
    return sizes.filter((f) => f.size >= size).sort((a, b) => a.size - b.size)[0] || sizes[sizes.length - 1];
}
function measure(f, text) {
    let w = 0;
    for (const ch of String(text)) { const g = f.glyphs[ch.codePointAt(0)] || f.glyphs[63]; if (g) w += g[6]; }
    return w;
}
module.exports = { get, measure };
