# Legacy standalone games

M Arcade is the only app distributed by this branch. Its six modules under `apps/iabadia_m_arcade/src/games/` are the active development source. The old standalone apps have separate models, menus, persistence and native wrappers; they are frozen reference snapshots and are not kept in sync with M Arcade.

| Legacy source | Preserved version |
| --- | --- |
| [2048](../apps/iabadia_2048) | 0.1.3 |
| [Minesweeper](../apps/iabadia_minesweeper) | 0.1.3 |
| [Snake](../apps/iabadia_snake) | 0.1.1 |
| [Tetris](../apps/iabadia_tetris) | 0.1.1 |
| [Space Invaders](../apps/iabadia_invaders) | 0.1.1 |
| [Breakout](../apps/iabadia_breakout) | 0.1.1 |

Their source, tests, screenshots, gameplay GIFs, licenses and packaging inputs remain in Git. Each old `release.json` is retained as `legacy-release.json`, so automatic release discovery skips it. `mgu-repo.json` lists only M Arcade. The release publisher also removes entries that are no longer registered when a catalog is next published; retiring the entries does not itself publish a catalog.

`npm test` still runs the legacy rule/lifecycle suites as regression reference. `npm run build`, `npm run size` and `npm run check` target M Arcade only. For an explicit historical build, use `npm run build:legacy`; this does not register or publish the standalone apps. Their individual preview commands remain available in the [development notes](DEVELOPMENT.md).

Existing car installations and private saves are left untouched. [Import exported saves into M Arcade](../apps/iabadia_m_arcade/README.md#import-existing-saves) before removing any old app through the Store. Retiring a catalog entry is not an instruction to delete its data.
