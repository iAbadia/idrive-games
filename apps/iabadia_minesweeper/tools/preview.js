// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path');
const {Session}=require('../src/session.js');
const {draw,WIDTH,HEIGHT}=require('../src/draw.js');
const {Canvas}=require('../src/kit_canvas.js');
const {play}=require('../src/kit_record.js');
function png(s){return play(draw(s).words(),new Canvas(WIDTH,HEIGHT)).png();}
function samples(){
    const s=new Session(null,{random:()=>0.47});s.visibility(true);s.game.cursor=40;s.input('center');s.game.elapsed=42000;
    const out=path.join(__dirname,'../preview');fs.writeFileSync(path.join(out,'game.png'),png(s));
    s.input('back');fs.writeFileSync(path.join(out,'menu.png'),png(s));
    const icon=new Canvas(140,140);icon.clear([0,0,0,0]);icon.roundRect(12,12,116,116,10,'#173953');
    icon.circle(70,77,27,'#eee4da');icon.line(70,39,70,115,4,'#eee4da');icon.line(32,77,108,77,4,'#eee4da');
    icon.line(44,51,96,103,4,'#eee4da');icon.line(44,103,96,51,4,'#eee4da');icon.circle(61,68,6,'#173953');
    const tree=require('../mgu-app.json').tree;
    fs.writeFileSync(path.join(__dirname,'..',tree,'rhmiData/variantGroups/Common/images/iabadia_minesweeper_icon.png'),icon.png());
    console.log(out);
}
module.exports={png};if(require.main===module)samples();
