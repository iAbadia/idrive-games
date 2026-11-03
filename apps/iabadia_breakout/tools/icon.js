// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path');const {Canvas}=require('../src/kit_canvas.js');const {Recorder,play}=require('../src/kit_record.js');
const r=new Recorder(140,140);r.clear([0,0,0,0]);r.roundRect(12,12,116,116,23,'#152230');r.strokeRoundRect(13,13,114,114,22,2,'#5289ae');
['#e5888e','#eaa875','#e7ce86'].forEach((c,y)=>{for(let x=0;x<4;x++){if(y===2&&x===2)continue;r.roundRect(25+x*23,29+y*14,20,11,2,c);}});r.line(82,80,68,97,2,'#425f77');r.circle(82,80,6,'#fff3dc');r.roundRect(44,104,52,8,4,'#80b7de');fs.writeFileSync(path.join(__dirname,'../assets/icon.png'),play(r.words(),new Canvas(140,140)).png());
