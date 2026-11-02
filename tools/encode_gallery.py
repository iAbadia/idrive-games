# SPDX-License-Identifier: GPL-3.0-or-later
"""Encode documentation GIFs; requires Pillow only, never part of app builds."""
from pathlib import Path
import sys
from PIL import Image
source, output = map(Path, sys.argv[1:])
for directory in sorted(source.iterdir()):
    files = sorted(directory.glob('*.png'))
    # A shared palette keeps the static typography and board colors stable.
    sample = Image.new('RGB', (640, 240 * 8))
    for n in range(8):
        with Image.open(files[n * (len(files)-1)//7]) as image:
            sample.paste(image.convert('RGB').resize((640,240),Image.Resampling.LANCZOS),(0,n*240))
    palette = sample.quantize(colors=128,method=Image.Quantize.MEDIANCUT)
    frames = []
    for file in files:
        with Image.open(file) as image:
            frames.append(image.convert('RGB').resize((640,240),Image.Resampling.LANCZOS).quantize(palette=palette,dither=Image.Dither.NONE))
    target = output / (directory.name + '.gif')
    frames[0].save(target,save_all=True,append_images=frames[1:],duration=50,loop=0,optimize=True,disposal=1)
    with Image.open(target) as gif:
        assert gif.size == (640,240) and gif.n_frames > 1
    print(f'{target.name}: {target.stat().st_size/1024:.1f} KiB')
