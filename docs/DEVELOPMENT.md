# Development notes

## Validation

Game rules, controller input, persistence, rendering, the mocked OAP
lifecycle and renderer wire protocol are covered by automated tests.
Builds are checked for reproducibility and Git history is scanned for secrets.

Head-unit emulator and physical controller/display validation have not
been completed. Desktop checks do not establish car-runtime compatibility.

## Packaging

Source packages contain no BMW SDK modules or built `javascript/app.js`.
The head unit links each app with its own SDK. Local SDK donors and
head-unit emulator environments are not part of this repository.

See [release tooling](../release/README.md) for build and publish commands.

## Package size

Run `npm run build` then `npm run size`. See [the measured comparison and budgets](APP_SIZES.md).

## Desktop previews

| Game | Command | URL |
| --- | --- | --- |
| 2048 | `npm run preview` | http://127.0.0.1:2048 |
| Minesweeper | `npm run preview:minesweeper` | http://127.0.0.1:2050 |
| Snake | `npm run preview:snake` | http://127.0.0.1:2051 |
| Space Invaders | `npm run preview:invaders` | http://127.0.0.1:2053 |
| Breakout | `npm run preview:breakout` | http://127.0.0.1:2054 |
| Tetris | `npm run preview:tetris` | http://127.0.0.1:2052 |

The [gallery media guide](media/README.md) covers screenshots and compact gameplay GIFs.
