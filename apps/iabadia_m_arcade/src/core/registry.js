// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const games = [
    require('../games/2048/definition.js'),
    require('../games/minesweeper/definition.js'),
    require('../games/snake/definition.js'),
    require('../games/tetris/definition.js'),
    require('../games/invaders/definition.js'),
    require('../games/breakout/definition.js'),
];
if (new Set(games.map((g) => g.id)).size !== games.length)
    throw Error('Duplicate game ID');
module.exports = { games, get: (id) => games.find((g) => g.id === id) };
