// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
module.exports = {
    id: 'snake',
    title: 'Snake',
    accent: '#9CE32D',
    tagline: 'Follow your own lead.',
    moduleVersion: '0.1.0',
    stateVersion: 1,
    icon: 'snake.png',
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
            'Wheel clockwise: turn right.',
            'Counterclockwise: turn left.',
            'Each step turns 90 degrees.',
            'Eat apples. Avoid walls and tail.',
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
