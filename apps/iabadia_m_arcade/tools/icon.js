// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs = require('fs'),
    path = require('path'),
    { Canvas } = require('../src/kit/kit_canvas.js');
const c = new Canvas(140, 140);
c.roundRect(12, 12, 116, 116, 24, '#9CAFC8');
c.roundRect(15, 15, 110, 110, 21, '#101621');
c.roundRect(37, 29, 66, 17, 4, '#D7E2F1');
c.roundRect(39, 45, 62, 40, 3, '#263547');
c.roundRect(44, 50, 52, 29, 2, '#080D14');
c.line(55, 65, 64, 65, 3, '#26C9F0');
c.line(60, 60, 60, 70, 3, '#26C9F0');
c.circle(81, 62, 3, '#F5B82E');
c.circle(88, 68, 3, '#A565F4');
c.quad(
    [
        [39, 85],
        [101, 85],
        [108, 99],
        [32, 99],
    ],
    '#D7E2F1',
);
c.line(48, 92, 48, 84, 3, '#F04444');
c.circle(48, 82, 4, '#F04444');
c.circle(79, 92, 3, '#9CE32D');
c.circle(92, 92, 3, '#FF9C2A');
c.roundRect(38, 100, 64, 12, 2, '#42526A');
fs.mkdirSync(path.join(__dirname, '../assets'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../assets/icon.png'), c.png());
