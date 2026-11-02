// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path');const {Canvas}=require('../src/kit_canvas.js');const {Recorder,play}=require('../src/kit_record.js');
const r=new Recorder(140,140);r.clear([0,0,0,0]);r.roundRect(12,12,116,116,22,'#17212d');r.strokeRoundRect(13,13,114,114,21,2,'#58799e');
const shapes=[{color:'#66d2e8',cells:[[0,4],[1,4],[2,4],[3,4]]},{color:'#b59bdf',cells:[[1,1],[0,2],[1,2],[2,2]]},{color:'#edcf72',cells:[[3,2],[4,2],[3,3],[4,3]]},{color:'#eeaa64',cells:[[0,0],[0,1],[0,3],[1,3]]}];
shapes.forEach(s=>s.cells.forEach(([x,y])=>{const px=25+x*18,py=25+y*18;r.roundRect(px,py,16,16,3,s.color);r.line(px+3,py+2,px+12,py+2,1,[255,255,255,120]);}));
fs.writeFileSync(path.join(__dirname,'../assets/icon.png'),play(r.words(),new Canvas(140,140)).png());
