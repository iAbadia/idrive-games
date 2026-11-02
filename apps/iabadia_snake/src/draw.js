// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const {Recorder}=require('./kit_record.js');
const {LEVELS,COLS,ROWS}=require('./game.js');
const WIDTH=1280,HEIGHT=480;
function draw(s,now){
 now=now===undefined?s.now():now;s.advance(now);
 const g=s.game,r=new Recorder(WIDTH,HEIGHT),bx=487,by=32,cell=26;
 r.clear('#000000');r.text('Snake',54,86,43,'#eee4da',{font:'bold'});
 r.text(LEVELS[g.level].label,58,123,22,'#a6a6ab');
 r.text('Score',58,182,20,'#a6a6ab');r.text(String(g.score),56,230,40,'#ffffff',{font:'num'});
 r.text('Best',237,182,20,'#a6a6ab');r.text(String(g.best[g.level]),235,230,40,'#edcf72',{font:'num'});
 r.roundRect(54,270,349,57,5,'#152c24');r.text('Wheel to steer',75,307,26,'#9be4b5',{font:'bold'});
 r.text('Clockwise: turn right',58,367,21,'#ceced2');r.text('Counterclockwise: turn left',58,400,21,'#ceced2');
 r.text(s.notice||'Press to pause',58,438,19,s.notice?'#f2b179':'#a6a6ab');
 r.roundRect(bx-6,by-6,COLS*cell+12,ROWS*cell+12,6,'#292d2b');r.fillRect(bx,by,COLS*cell,ROWS*cell,'#101714');
 for(let y=1;y<ROWS;y++)r.line(bx,by+y*cell,bx+COLS*cell,by+y*cell,1,'#17201b');
 for(let x=1;x<COLS;x++)r.line(bx+x*cell,by,bx+x*cell,by+ROWS*cell,1,'#17201b');
 if(g.food!==null){const fx=bx+(g.food%COLS+.5)*cell,fy=by+(Math.floor(g.food/COLS)+.5)*cell;r.circle(fx,fy,8,'#edb45d');r.line(fx,fy-8,fx+3,fy-12,2,'#9be4b5');}
 g.snake.slice().reverse().forEach((n,i)=>{const head=i===g.snake.length-1,x=bx+n%COLS*cell,y=by+Math.floor(n/COLS)*cell;r.roundRect(x+1,y+1,cell-2,cell-2,head?7:4,head?'#a1ebba':'#4eac7b');
 if(head){const points=[[[7,7],[18,7]],[[18,7],[18,18]],[[7,18],[18,18]],[[7,7],[7,18]]][g.dir];points.forEach(p=>r.circle(x+p[0],y+p[1],2.5,'#10261b'));}});
 if(!s.menu&&g.status==='ready') {r.roundRect(bx+124,by+167,480,82,6,[0,0,0,225]);r.text('Turn the wheel to start',bx+364,by+218,28,'#ffffff',{align:'center',font:'bold'});}
 if(!s.menu)return r;
 r.fillRect(bx,by,COLS*cell,ROWS*cell,[0,0,0,100]);
 const mx=30,my=24,mw=390;r.roundRect(mx,my,mw,432,7,'#141416');
 r.text({initials:'New high score',pause:'Paused',lost:'Game over',won:'Board cleared',confirm:'Start a new game?',difficulty:'Speed',scores:'High scores',help:'How to play'}[s.menu],mx+24,my+51,29,'#ffffff',{font:'bold'});
 if(s.menu==='initials'){
 r.text(String(g.best[g.level])+' points',mx+24,my+100,32,'#edcf72',{font:'num'});
 s.initials.split('').forEach((letter,i)=>{const x=mx+28+i*112;r.roundRect(x,my+145,100,85,5,i===s.letter?'#173953':'#252528');r.text(letter,x+50,my+205,42,'#ffffff',{align:'center',font:'num'});if(i===s.letter)r.fillRect(x+12,my+225,76,3,'#59b9ed');});
 ['Wheel or up/down: change letter','Left/right: move between letters','Press: next letter; third saves'].forEach((t,i)=>r.text(t,mx+24,my+285+i*30,19,'#bdbdc3'));if(s.notice)r.text(s.notice,mx+24,my+409,17,'#f2b179');return r;
 }
 if(s.menu==='confirm')r.text('Current progress will be replaced.',mx+24,my+100,19,'#a6a6ab');
 if(s.menu==='help')['Eat food to grow and score points.','Avoid the walls and your own tail.','','Wheel clockwise: turn right.','Counterclockwise: turn left.','Each wheel step turns 90 degrees.','Press or Back to pause.','Tilt can also steer the head.'].forEach((t,i)=>r.text(t,mx+24,my+93+i*29,19,'#ceced2'));
 if(s.menu==='scores')Object.keys(LEVELS).forEach((k,i)=>{r.text(LEVELS[k].label+'  '+(g.names[k]||'---'),mx+24,my+120+i*54,23,'#ceced2');r.text(String(g.best[k]),mx+mw-24,my+120+i*54,24,'#edcf72',{align:'right',font:'num'});});
 const start=['scores','help'].includes(s.menu)?my+356:s.menu==='confirm'?my+226:my+87;
 s.labels().forEach((label,i)=>{const y=start+i*47;if(i===s.focus){r.roundRect(mx+12,y,mw-24,41,4,'#173953');r.fillRect(mx+12,y+6,3,29,'#59b9ed');}r.text(label,mx+27,y+28,22,i===s.focus?'#ffffff':'#bdbdc3');});
 if(s.notice)r.text(s.notice,mx+24,my+418,17,'#f2b179');return r;
}
module.exports={draw,WIDTH,HEIGHT};
