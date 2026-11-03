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

Run `npm run build` then `npm run size` for the active M Arcade app. See [the measured comparison and budgets](APP_SIZES.md).

## Desktop previews

M Arcade is the active product. Individual previews below are frozen legacy references; update games in `apps/iabadia_m_arcade/src/games/`.

| Game | Command | URL |
| --- | --- | --- |
| M Arcade | `npm run preview:arcade` | http://127.0.0.1:2055 |
| 2048 | `npm run preview:2048` | http://127.0.0.1:2048 |
| Minesweeper | `npm run preview:minesweeper` | http://127.0.0.1:2050 |
| Snake | `npm run preview:snake` | http://127.0.0.1:2051 |
| Space Invaders | `npm run preview:invaders` | http://127.0.0.1:2053 |
| Breakout | `npm run preview:breakout` | http://127.0.0.1:2054 |
| Tetris | `npm run preview:tetris` | http://127.0.0.1:2052 |

The [gallery media guide](media/README.md) covers screenshots and compact gameplay GIFs.

## M Arcade

The [M Arcade architecture](architecture/M_ARCADE.md) documents the implemented shared shell, game contract, persistence, packaging and save import. Canonical source is `apps/iabadia_m_arcade/src/`; its build generates the committed flat module aliases in `package-src/`. The standalone source is frozen and excluded from release discovery; see [legacy policy](LEGACY_GAMES.md). New collection icons follow the repository [M Arcade Icons skill](../.agents/skills/m-arcade-icons/SKILL.md).

Regenerate the carousel documentation loop with `node apps/iabadia_m_arcade/tools/carousel_media.js` (Python and Pillow required). It renders the real native UI into a GIF; preview media is excluded from app packages.

`npm run build` and the release catalog target M Arcade only. `npm run build:legacy` is an explicit historical build of the retained standalone packages. Their regression suites remain part of `npm test`.
