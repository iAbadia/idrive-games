// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const games = [
    require('./games_2048_definition.js'),
    require('./games_minesweeper_definition.js'),
    require('./games_snake_definition.js'),
    require('./games_tetris_definition.js'),
    require('./games_invaders_definition.js'),
    require('./games_breakout_definition.js'),
];
if (new Set(games.map((g) => g.id)).size !== games.length)
    throw Error('Duplicate game ID');
module.exports = { games, get: (id) => games.find((g) => g.id === id) };
