// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
module.exports = {
    id: 'minesweeper',
    title: 'Minesweeper',
    accent: '#B8C4D6',
    tagline: 'Every number tells a story.',
    moduleVersion: '0.1.0',
    stateVersion: 1,
    icon: 'minesweeper.png',
    defaultMode: 'beginner',
    modes: [
        {
            id: 'beginner',
            label: 'Beginner',
        },
        {
            id: 'intermediate',
            label: 'Intermediate',
        },
        {
            id: 'expert',
            label: 'Expert',
        },
    ],
    controls: {
        help: [
            'Tilt to move the cursor.',
            'Wheel: Reveal, Flag or Menu.',
            'Press to perform that action.',
            'Clear all safe cells to win.',
        ],
        centerDuringPlay: 'game-action',
    },
    timing: {
        maxDeltaMs: 250,
    },
    rankings: [
        {
            id: 'beginner',
            metric: 'milliseconds',
            order: 'asc',
            limit: 1,
            ties: 'keep-existing',
        },
        {
            id: 'intermediate',
            metric: 'milliseconds',
            order: 'asc',
            limit: 1,
            ties: 'keep-existing',
        },
        {
            id: 'expert',
            metric: 'milliseconds',
            order: 'asc',
            limit: 1,
            ties: 'keep-existing',
        },
    ],
    load: () => require('./runtime.js'),
};
