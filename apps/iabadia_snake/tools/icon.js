// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Native vector drawing, transparent 140px launcher canvas; 12px safe padding.
const fs=require('fs'),path=require('path');const {Canvas}=require('../src/kit_canvas.js');const {Recorder,play}=require('../src/kit_record.js');
const r=new Recorder(140,140);r.clear([0,0,0,0]);r.roundRect(12,12,116,116,23,'#1b3025');r.strokeRoundRect(13,13,114,114,22,2,'#3e6e51');
r.roundRect(30,38,76,21,10,'#70c58c');r.roundRect(30,43,21,49,10,'#70c58c');r.roundRect(34,78,64,21,10,'#70c58c');r.roundRect(85,62,21,36,10,'#70c58c');r.roundRect(78,57,34,25,10,'#a1ebba');r.circle(101,64,3,'#10261b');r.circle(101,76,3,'#10261b');r.circle(68,66,7,'#edb45d');
fs.writeFileSync(path.join(__dirname,'../assets/icon.png'),play(r.words(),new Canvas(140,140)).png());
