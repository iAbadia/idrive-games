// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path');const {Canvas}=require('../src/kit_canvas.js');const {Recorder,play}=require('../src/kit_record.js');const {sprite,SPRITES,SHIP}=require('../src/draw.js');
const r=new Recorder(140,140);r.clear([0,0,0,0]);r.roundRect(12,12,116,116,23,'#13232b');r.strokeRoundRect(13,13,114,114,22,2,'#528c9b');sprite(r,SPRITES[0],70,52,8,'#8fd3ac');sprite(r,SHIP,70,107,3,'#c3ede0');r.fillRect(69,83,3,10,'#edcf72');r.fillRect(29,79,3,7,'#f19a83');r.fillRect(107,75,3,7,'#f19a83');fs.writeFileSync(path.join(__dirname,'../assets/icon.png'),play(r.words(),new Canvas(140,140)).png());
