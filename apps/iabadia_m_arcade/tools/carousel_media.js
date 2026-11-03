// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Small documentation loop rendered from the actual native carousel. Requires Python/Pillow.
const fs = require('fs'),
    path = require('path'),
    os = require('os'),
    cp = require('child_process');
const { Session } = require('../src/core/session.js'),
    { png } = require('./preview.js');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'm-arcade-carousel-'));
let now = 1000;
const s = new Session({
    now: () => now,
    store: { shell: () => null, has: () => false, saveShell() {} },
});
s.visibility(true);
const frames = [];
function capture(duration) {
    const file = path.join(
        temp,
        String(frames.length).padStart(3, '0') + '.png',
    );
    fs.writeFileSync(file, png(s));
    frames.push({ file, duration });
}
capture(600);
for (const turn of [1, 1, -2]) {
    s.input('rotate', turn);
    for (let frame = 0; frame <= 7; frame++) {
        if (frame) {
            now += 40;
            s.advance(now);
        }
        capture(frame === 7 ? 600 : 40);
    }
}
const output = path.join(__dirname, '../preview/carousel.gif');
const python = String.raw`
import json,sys
from PIL import Image
job=json.load(sys.stdin)
images=[Image.open(frame['file']).convert('RGB').resize((640,240),Image.Resampling.LANCZOS) for frame in job['frames']]
sheet=Image.new('RGB',(640,240*len(images)))
for index,image in enumerate(images): sheet.paste(image,(0,index*240))
palette=sheet.quantize(colors=128)
images=[image.quantize(palette=palette,dither=Image.Dither.NONE) for image in images]
images[0].save(job['output'],save_all=True,append_images=images[1:],loop=0,duration=[frame['duration'] for frame in job['frames']],disposal=2,optimize=True)
`;
const result = cp.spawnSync(process.env.PYTHON || 'python', ['-c', python], {
    input: JSON.stringify({ frames, output }),
    encoding: 'utf8',
});
if (result.error || result.status !== 0)
    throw result.error || Error(result.stderr);
console.log(
    path.basename(output) +
        ': ' +
        Math.round(fs.statSync(output).size / 1024) +
        ' KiB',
);
