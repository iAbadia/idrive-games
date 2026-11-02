# App sizes

Measured 2 November 2026. KiB = 1,024 bytes; MiB = 1,048,576 bytes.

| App | Version | Compressed source package | Unpacked source |
| --- | --- | ---: | ---: |
| Tetris | 0.1.1 | ~153 KiB | ~290 KiB |
| Snake | 0.1.1 | ~154 KiB | ~289 KiB |
| Minesweeper | 0.1.3 | ~156 KiB | ~296 KiB |
| 2048 | 0.1.3 | ~231 KiB | ~402 KiB |
| Waze on cluster | 0.4.1 | 28.7 KiB | Not measured |
| Store | 0.9.16 | 1,408.7 KiB (1.38 MiB) | Not measured |

Our sizes come from `npm run build` and `npm run size`. Comparison download
sizes come from the published [idrive-apps catalog](https://github.com/robertnisipeanu/idrive-apps/releases/tag/catalog)
and [mgu-store catalog](https://github.com/robertnisipeanu/mgu-store/releases/tag/catalog).
All six entries use source packages built on the head unit. Waze's native
map tool and cluster renderer are separate dependencies and are not included
in its small app package. Likewise, our renderer is an existing shared tool,
not duplicated in each game.

These are app payload sizes, not installed disk usage or memory usage.
The car links in its SDK; its exact output size has not been measured here.
Branch installs fetch the repository archive, including documentation and
other games, so total network transfer is larger than an individual package.
The source packages themselves exclude screenshots, tests, preview tools,
SDK modules and runtime saves.

## Budget

CI builds every game, then runs `npm run size`. Each game must fit within
512 KiB compressed and 1 MiB unpacked source. The check also rejects packages
containing preview, test, dependency or app-data directories.

Minesweeper's initial package was 289.5 KiB. Removing unused regular 41/50 px
and semibold 58/77/103 px font atlases reduced it to 133.7 KiB (54% smaller).
The retained atlas data and font keys are unchanged; no glyph quality was
reduced at the drawing sizes used by the game. Regenerate that subset with
`node apps/iabadia_minesweeper/tools/trim_fonts.js` if the upstream fonts change.

2048 0.1.2 removes unused regular 41/50 px and semibold 77 px atlases.
Its package fell from 293.1 KiB to 213.7 KiB (27% smaller). A comparison
of 87 rendered states and animation frames was byte-identical. The 103 px
atlas remains necessary for the title; 58 px is used by initials and tile pops.

Minesweeper 0.1.2 uses a richer reference-based launcher icon (about 23 KiB). Only the 140px production PNG ships; the large generated master is excluded.

2048 0.1.3 adds a reference-inspired gold launcher tile (about 20 KiB PNG), retaining the optimized font subset.

Snake reuses the small Minesweeper font subset and ships a small padded launcher icon, with no third-party game engine or runtime npm packages.

Tetris uses the same small font subset and shared renderer. Its game rules, next-piece preview and ghost outline add no external engine or npm runtime dependencies.
