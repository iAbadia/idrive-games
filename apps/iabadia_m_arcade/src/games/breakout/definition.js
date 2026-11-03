// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
module.exports = {
    id: 'breakout',
    title: 'Breakout',
    accent: '#FF9C2A',
    tagline: 'Make every bounce count.',
    moduleVersion: '0.1.0',
    stateVersion: 1,
    icon: 'breakout.png',
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
            'Wheel or tilt left/right: move.',
            'The ball launches automatically.',
            'Paddle edges aim the ball.',
            'Clear the wall to advance.',
        ],
        centerDuringPlay: 'pause',
    },
    timing: {
        maxDeltaMs: 50,
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
