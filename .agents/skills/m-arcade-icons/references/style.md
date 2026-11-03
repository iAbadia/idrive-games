# M Arcade icon family

## Geometry and delivery

| Property | Standard |
| --- | --- |
| Production | 140 x 140 PNG, RGBA, transparent exterior |
| Tile bounds | 116 x 116 at (12, 12); no opaque pixels outside this box |
| Shape | Rounded square, corner radius about 24 production pixels |
| Master | Prefer 1024 x 1024; tile 848 x 848 at (88, 88), radius 176 |
| Main symbol | Approximately 80-84 px production size, optically centred |
| Rim | About 3 px production, consistent across the family |
| File budget | Aim <= 24 KiB; hard maximum 32 KiB per final icon |

The tile itself establishes the scale. Do not enlarge a small floating symbol to fill 116 px without the common tile. Downsample the whole tile and symbol together. Leave the external area fully transparent, including rounded corners. Avoid shadows outside the tile, fuzzy borders, disconnected sparks and ambient glow. Crisp anti-aliasing at the tile edge is welcome.

## Material and colour

Use a dark navy interior (#101621, shading toward #080D14), a restrained bevel, a coloured rim and lighting from the upper left. Keep highlight direction, rim thickness and perceived depth consistent. Confine glow/highlights inside the tile. Avoid photographic detail and excessive glossy reflections: the silhouette must read at 32 px.

| Game | Accent | Recognizable subject |
| --- | --- | --- |
| 2048 | Warm gold #F5B82E | Bold 2048 numerals as the game symbol |
| Minesweeper | Silver #B8C4D6, red #F04444 detail | Mine, numbered cells and triangular red flag |
| Snake | Lime #9CE32D | Blocky green snake and small red apple |
| Tetris | Cyan #26C9F0 | T-shaped tetromino with restrained coloured blocks |
| Space Invaders | Violet #A565F4 | Pixel alien, optional small ship |
| Breakout | Orange #FF9C2A | Brick rows, white ball and paddle |
| M Arcade launcher | Cool silver with small collection accents | One simple arcade symbol, distinct from a single game |

Accent colours are reference targets, not a demand to recolour user-approved supplied artwork. Frame geometry and visual weight matter more than an exact hex match. Use off-white, silver and the accent for symbols; retain recognizable game colours (red flags/apples, coloured tetrominoes). Do not add a game title or tiny captions. The 2048 numerals are its symbol, so they are the intentional text exception. The native launcher/library supplies labels.

## Creation brief

For a new raster asset, adapt this brief and include the supplied image when editing:

> Create a compact M Arcade icon for [GAME], preserving [REFERENCE SUBJECT]. A single rounded-square dark navy tile, consistent subtle bevel, [ACCENT] rim, upper-left lighting and [CENTRAL SYMBOL]. Clear silhouette and few large details, readable at 32 px. No title, tiny text, manufacturer branding, external shadow, outer glow or disconnected particles. Transparent exterior; dark tile interior remains opaque. Square 1024 px master, full tile about 848 px centred with clear margins. Match the family frame rather than adding more detail.

Inspect generated art before mechanical export. Correct halos, matte backgrounds, edge debris and subject errors with the image editor/generation tool; export does not fix them. For existing SVG art, edit its paths/gradients directly instead of raster-generating it.

## Review and asset ownership

Review a row at native 140 px and reduced 64/32 px on both black and a checkerboard. The tile must match siblings in scale, material and visual weight. Verify the mine flag is triangular/red and the Snake apple red where those details appear. Keep attribution/licensing with the master and record any generation/edit brief so revisions are reproducible. Do not commit a user's unrelated local paths or private source files.

This specification applies to new M Arcade assets. Existing approved standalone icons remain unchanged until their migration is explicitly in scope.
