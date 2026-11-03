// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const {Recorder}=require('./kit_record.js');const {LEVELS,W,H,R,PADDLE_Y,brickBox}=require('./game.js');
const WIDTH=1280,HEIGHT=480;
const COLORS=['#e5888e','#eaa875','#e7ce86','#92c7a1','#85b9d8','#b49bcf'];
function draw(s,now){
 now=now===undefined?s.now():now;s.advance(now);const g=s.game,r=new Recorder(WIDTH,HEIGHT),bx=475,by=38;
 r.clear('#000000');r.text('Breakout',54,83,43,'#eee4da',{font:'bold'});r.text(LEVELS[g.level].label,58,123,22,'#a6a6ab');
 r.text('Score',58,178,20,'#a6a6ab');r.text(String(g.score),56,222,36,'#ffffff',{font:'num'});r.text('Best',237,178,20,'#a6a6ab');r.text(String(g.best[g.level]),235,222,36,'#edcf72',{font:'num'});
 r.text('Wave',58,277,20,'#a6a6ab');r.text(String(g.wave),58,315,31,'#ffffff',{font:'num'});r.text('Lives',237,277,20,'#a6a6ab');for(let i=0;i<g.lives;i++)r.circle(248+i*34,304,7,'#eee4da');
 r.text('Wheel to move',58,374,24,'#ceced2');r.text('Aim with the paddle edges',58,410,21,'#a6a6ab');r.text(s.notice||'Press to pause',58,445,19,s.notice?'#f2b179':'#a6a6ab');
 r.roundRect(bx-6,by-6,W+12,H+12,6,'#252a30');r.fillRect(bx,by,W,H,'#0b1016');
 g.bricks.forEach(v=>{const p=brickBox(v),c=COLORS[v.row];r.roundRect(bx+p.x,by+p.y,p.w,p.h,2,c);r.line(bx+p.x+3,by+p.y+2,bx+p.x+p.w-4,by+p.y+2,1,[255,255,255,85]);if(v.hp===2)r.line(bx+p.x+4,by+p.y+p.h-3,bx+p.x+p.w-4,by+p.y+p.h-3,2,'#49434d');});
 g.trail.forEach((v,i)=>r.circle(bx+v.x,by+v.y,2+i/5,[200,222,240,Math.round(i/g.trail.length*100)]));
 g.effects.forEach(v=>r.roundRect(bx+v.x,by+v.y,v.w,v.h,2,[255,255,255,Math.round(170*(1-(g.time-v.at)/180))]));
 r.roundRect(bx+g.paddle-g.width/2,by+PADDLE_Y,g.width,10,4,'#80b7de');r.line(bx+g.paddle-g.width/2+6,by+PADDLE_Y+2,bx+g.paddle+g.width/2-6,by+PADDLE_Y+2,1,'#c6e2f5');
 if(!g.ended())r.circle(bx+g.ball.x,by+g.ball.y,R,'#fff3dc');
 if(!s.menu&&g.status==='ready'){r.roundRect(bx+130,by+230,500,64,5,[0,0,0,225]);r.text('Turn the wheel to start',bx+380,by+270,26,'#ffffff',{font:'bold',align:'center'});}
 else if(!s.menu&&g.serve>0)r.text('Launching...',bx+W/2,by+H-58,21,'#bdbdc3',{align:'center'});
 if(!s.menu)return r;r.fillRect(bx,by,W,H,[0,0,0,100]);
 const mx=30,my=24,mw=390;r.roundRect(mx,my,mw,432,7,'#141416');
 r.text({initials:'New high score',pause:'Paused',lost:'Game over',won:'Board cleared',confirm:'Start a new game?',difficulty:'Difficulty',scores:'High scores',help:'How to play'}[s.menu],mx+24,my+51,29,'#ffffff',{font:'bold'});
 if(s.menu==='initials'){
 r.text(String(g.best[g.level])+' points',mx+24,my+100,32,'#edcf72',{font:'num'});
 s.initials.split('').forEach((letter,i)=>{const x=mx+28+i*112;r.roundRect(x,my+145,100,85,5,i===s.letter?'#173953':'#252528');r.text(letter,x+50,my+205,42,'#ffffff',{align:'center',font:'num'});if(i===s.letter)r.fillRect(x+12,my+225,76,3,'#59b9ed');});
 ['Wheel or up/down: change letter','Left/right: move between letters','Press: next letter; third saves'].forEach((t,i)=>r.text(t,mx+24,my+285+i*30,19,'#bdbdc3'));if(s.notice)r.text(s.notice,mx+24,my+409,17,'#f2b179');return r;
 }
 if(s.menu==='confirm')r.text('Current progress will be replaced.',mx+24,my+100,19,'#a6a6ab');
 if(s.menu==='help')['Wheel: move the paddle left/right.','Tilt left/right also moves.','The ball launches automatically.','Press or Back to pause.','','Hit the paddle edge to aim.','Upper bricks need two hits.','Clear the wall to advance.'].forEach((t,i)=>r.text(t,mx+24,my+93+i*29,19,'#ceced2'));
 if(s.menu==='scores')Object.keys(LEVELS).forEach((k,i)=>{r.text(LEVELS[k].label+'  '+(g.names[k]||'---'),mx+24,my+120+i*54,23,'#ceced2');r.text(String(g.best[k]),mx+mw-24,my+120+i*54,24,'#edcf72',{align:'right',font:'num'});});
 const start=['scores','help'].includes(s.menu)?my+356:s.menu==='confirm'?my+226:my+87;
 s.labels().forEach((label,i)=>{const y=start+i*47;if(i===s.focus){r.roundRect(mx+12,y,mw-24,41,4,'#173953');r.fillRect(mx+12,y+6,3,29,'#59b9ed');}r.text(label,mx+27,y+28,22,i===s.focus?'#ffffff':'#bdbdc3');});
 if(s.notice)r.text(s.notice,mx+24,my+418,17,'#f2b179');return r;
}
module.exports={draw,WIDTH,HEIGHT};
