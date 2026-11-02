# Gallery media

The root README uses four compact looping GIFs. Full-resolution 1280x480 screenshots live in each app's `preview/game.png` and are linked below the clips and in the expandable screenshot gallery.

## Regenerate

Requires Node.js 22+, Python 3 and Pillow (`python -m pip install Pillow`). These are documentation tools, not game dependencies.

```sh
npm run media
```

`tools/gallery.js` runs the actual game sessions and drawing code offline at 20 frames per second with a synthetic clock and deterministic random seeds. No personal save files are read or written. Controllers are scripted: 2048 makes a sequence of moves; Minesweeper reveals and flags cells; Snake steers along legal routes to food; Tetris chooses legal placements and drops pieces. Warm-up moves give the recordings representative positions. The generated frames are real game output, not mockups or footage from a car.

`tools/encode_gallery.py` downsizes frames to 640x240 with a shared 128-color palette per clip, preserving timing and looping indefinitely. Duplicate frames are combined by the encoder. PNG frame sequences stay in a temporary directory and are removed after successful encoding. High-resolution screenshots are captured during the same runs.

| Game | Length | GIF size |
| --- | ---: | ---: |
| 2048 | 6 seconds | ~159 KiB |
| Minesweeper | 8 seconds | ~63 KiB |
| Snake | 8 seconds | ~54 KiB |
| Tetris | 10 seconds | ~132 KiB |

The four clips total about 408 KiB. Screenshots can be opened without playing an animation. GIFs and screenshots are documentation assets and are excluded from all game source packages. Branch-based Store installs fetch the repository archive, so documentation still contributes to that download.
