// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path');
const {Session}=require('../src/session.js');
const {draw,WIDTH,HEIGHT}=require('../src/draw.js');
const {Canvas}=require('../src/kit_canvas.js');
const {play}=require('../src/kit_record.js');
function png(s){return play(draw(s).words(),new Canvas(WIDTH,HEIGHT)).png();}
function samples(){
    const s=new Session(null,{random:()=>0.47});s.visibility(true);
    s.game.steer('right');s.game.serve=0;s.game.ball={x:470,y:246,vx:-155,vy:245};s.game.bricks=s.game.bricks.filter(v=>!(v.col===6&&v.row>2));s.game.score=120;s.game.best.classic=980;s.stamp=s.now();
    const out=path.join(__dirname,'../preview');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'game.png'),png(s));
    s.input('back');fs.writeFileSync(path.join(out,'menu.png'),png(s));
    const tree=require('../mgu-app.json').tree;
    fs.copyFileSync(path.join(__dirname,'../assets/icon.png'),path.join(__dirname,'..',tree,'rhmiData/variantGroups/Common/images/iabadia_breakout_icon.png'));
    console.log(out);
}
module.exports={png};if(require.main===module)samples();
