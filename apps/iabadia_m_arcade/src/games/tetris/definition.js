// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
module.exports = {
    id: 'tetris',
    title: 'Tetris',
    accent: '#26C9F0',
    tagline: 'Find a place for every piece.',
    moduleVersion: '0.1.0',
    stateVersion: 1,
    icon: 'tetris.png',
    defaultMode: 'classic',
    modes: [
        {
            id: 'relaxed',
            label: 'Relaxed',
        },
        {
            id: 'classic',
            label: 'Classic',
        },
        {
            id: 'fast',
            label: 'Fast',
        },
    ],
    controls: {
        help: [
            'Wheel: slide left or right.',
            'Tilt left/right: rotate.',
            'Down: soft drop. Up: hard drop.',
            'Clear rows to score points.',
        ],
        centerDuringPlay: 'pause',
    },
    timing: {
        maxDeltaMs: 100,
    },
    rankings: [
        {
            id: 'relaxed',
            metric: 'points',
            order: 'desc',
            limit: 1,
            ties: 'keep-existing',
        },
        {
            id: 'classic',
            metric: 'points',
            order: 'desc',
            limit: 1,
            ties: 'keep-existing',
        },
        {
            id: 'fast',
            metric: 'points',
            order: 'desc',
            limit: 1,
            ties: 'keep-existing',
        },
    ],
    load: () => require('./runtime.js'),
};
