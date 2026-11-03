// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
module.exports = {
    id: '2048',
    title: '2048',
    winTitle: '2048 reached',
    accent: '#F5B82E',
    tagline: 'Slide. Merge. One more move.',
    moduleVersion: '0.1.0',
    stateVersion: 1,
    icon: '2048.png',
    defaultMode: 'classic',
    modes: [
        {
            id: 'classic',
            label: 'Classic',
        },
    ],
    controls: {
        help: [
            'Tilt in any direction to move.',
            'Matching tiles merge into one.',
            'Reach 2048, then keep playing.',
        ],
        centerDuringPlay: 'pause',
    },
    timing: {
        maxDeltaMs: 100,
    },
    rankings: [
        {
            id: 'classic',
            metric: 'points',
            order: 'desc',
            limit: 5,
            ties: 'keep-existing',
        },
    ],
    load: () => require('./games_2048_runtime.js'),
};
