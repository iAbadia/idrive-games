// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
module.exports = {
    id: 'invaders',
    title: 'Space Invaders',
    accent: '#A565F4',
    tagline: 'Hold the line.',
    moduleVersion: '0.1.0',
    stateVersion: 1,
    icon: 'invaders.png',
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
            'Your ship fires automatically.',
            'Shields block both sides.',
            'Clear waves. Protect your lives.',
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
