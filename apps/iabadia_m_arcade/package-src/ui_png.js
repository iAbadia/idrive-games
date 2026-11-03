// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Deliberately restricted to the collection's bounded, non-interlaced RGBA8 PNGs.
const zlib = require('zlib');
function decode(b) {
    if (
        !Buffer.isBuffer(b) ||
        b.length > 32768 ||
        b.length < 33 ||
        b.slice(0, 8).toString('hex') !== '89504e470d0a1a0a'
    )
        throw Error('Invalid icon PNG');
    let w,
        h,
        parts = [],
        ended = false,
        header = false;
    for (let p = 8; p + 12 <= b.length; ) {
        const n = b.readUInt32BE(p),
            t = b.toString('ascii', p + 4, p + 8);
        if (n > b.length - p - 12) throw Error('Truncated PNG');
        const d = b.slice(p + 8, p + 8 + n);
        if (t === 'IHDR') {
            if (header || p !== 8 || n !== 13)
                throw Error('Invalid PNG header');
            w = d.readUInt32BE(0);
            h = d.readUInt32BE(4);
            if (
                w !== 140 ||
                h !== 140 ||
                d[8] !== 8 ||
                d[9] !== 6 ||
                d[10] ||
                d[11] ||
                d[12]
            )
                throw Error('Expected a 140px RGBA8 icon');
            header = true;
        } else if (t === 'IDAT') {
            if (!header) throw Error('Missing PNG header');
            parts.push(d);
        } else if (t === 'IEND') {
            ended = true;
            break;
        }
        p += n + 12;
    }
    if (!ended || !parts.length) throw Error('Incomplete PNG');
    const stride = w * 4,
        expected = (stride + 1) * h,
        raw = zlib.inflateSync(Buffer.concat(parts), {
            maxOutputLength: expected,
        });
    if (raw.length !== expected) throw Error('Invalid PNG data size');
    const out = Buffer.alloc(w * h * 4);
    function paeth(a, c, d) {
        const p = a + c - d,
            x = Math.abs(p - a),
            y = Math.abs(p - c),
            z = Math.abs(p - d);
        return x <= y && x <= z ? a : y <= z ? c : d;
    }
    for (let y = 0; y < h; y++) {
        const filter = raw[y * (stride + 1)];
        if (filter > 4) throw Error('Invalid PNG filter');
        for (let x = 0; x < stride; x++) {
            const i = y * stride + x,
                a = x >= 4 ? out[i - 4] : 0,
                c = y ? out[i - stride] : 0,
                d = y && x >= 4 ? out[i - stride - 4] : 0;
            out[i] =
                (raw[y * (stride + 1) + 1 + x] +
                    (filter === 0
                        ? 0
                        : filter === 1
                          ? a
                          : filter === 2
                            ? c
                            : filter === 3
                              ? Math.floor((a + c) / 2)
                              : paeth(a, c, d))) &
                255;
        }
    }
    return { w, h, data: out };
}
module.exports = { decode };
