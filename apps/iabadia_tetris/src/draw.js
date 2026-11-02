// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const {Recorder}=require('./kit_record.js');
const {LEVELS,KINDS,cells}=require('./game.js');
const WIDTH=1280,HEIGHT=480;
const COLORS=['#161b22','#66d2e8','#6989e0','#eeaa64','#edcf72','#8acb91','#b59bdf','#e78086'];
function block(r,x,y,n,size,ghost){
 if(ghost){r.strokeRoundRect(x+2,y+2,size-4,size-4,2,1,COLORS[n]);return;}
 r.roundRect(x+1,y+1,size-2,size-2,2,COLORS[n]);r.line(x+3,y+2,x+size-4,y+2,1,[255,255,255,100]);
}
function draw(s,now){
 now=now===undefined?s.now():now;s.advance(now);
 const g=s.game,r=new Recorder(WIDTH,HEIGHT),bx=610,by=20,cell=22;
 r.clear('#000000');r.text('Tetris',54,86,43,'#eee4da',{font:'bold'});
 r.text(LEVELS[g.level].label,58,123,22,'#a6a6ab');
 r.text('Score',58,182,20,'#a6a6ab');r.text(String(g.score),56,230,40,'#ffffff',{font:'num'});
 r.text('Best',237,182,20,'#a6a6ab');r.text(String(g.best[g.level]),235,230,40,'#edcf72',{font:'num'});
 r.text('Wheel to slide',58,295,24,'#ceced2');r.text('Tilt left / right to rotate',58,334,21,'#a6a6ab');
 r.text('Down: soft drop',58,374,21,'#a6a6ab');r.text('Up: hard drop',58,407,21,'#a6a6ab');r.text(s.notice||'Press to pause',58,443,19,s.notice?'#f2b179':'#a6a6ab');
 r.roundRect(bx-5,by-5,230,450,5,'#30343c');r.fillRect(bx,by,220,440,'#101419');
 for(let y=1;y<20;y++)r.line(bx,by+y*cell,bx+220,by+y*cell,1,'#1a2028');
 for(let x=1;x<10;x++)r.line(bx+x*cell,by,bx+x*cell,by+440,1,'#1a2028');
 g.board.forEach((n,i)=>{if(n)block(r,bx+i%10*cell,by+Math.floor(i/10)*cell,n,cell);});
 if(!g.ended())cells(g.ghost()).forEach(([x,y])=>{if(y>=0)block(r,bx+x*cell,by+y*cell,KINDS.indexOf(g.piece.kind)+1,cell,true);});
 cells(g.piece).forEach(([x,y])=>{if(y>=0&&y<20)block(r,bx+x*cell,by+y*cell,KINDS.indexOf(g.piece.kind)+1,cell);});
 if(s.flashUntil>now)g.cleared.forEach(y=>r.fillRect(bx,by+y*cell,220,cell,[255,255,255,Math.round(130*(s.flashUntil-now)/180)]));
 r.text('Next',938,62,22,'#a6a6ab');
 g.next.forEach((kind,i)=>cells({kind,rot:0,x:0,y:0}).forEach(([x,y])=>block(r,940+x*22,82+i*74+y*22,KINDS.indexOf(kind)+1,22)));
 r.text('Level',938,342,20,'#a6a6ab');r.text(String(g.stage),938,380,31,'#ffffff',{font:'num'});
 r.text('Lines',1080,342,20,'#a6a6ab');r.text(String(g.lines),1080,380,31,'#ffffff',{font:'num'});
 if(!s.menu&&g.status==='ready'){r.roundRect(526,195,390,81,5,[0,0,0,235]);r.text('Turn the wheel to start',721,244,26,'#ffffff',{align:'center',font:'bold'});}
 if(!s.menu)return r;
 r.fillRect(bx,by,220,440,[0,0,0,100]);
 const mx=30,my=24,mw=390;r.roundRect(mx,my,mw,432,7,'#141416');
 r.text({initials:'New high score',pause:'Paused',lost:'Game over',confirm:'Start a new game?',difficulty:'Speed',scores:'High scores',help:'How to play'}[s.menu],mx+24,my+51,29,'#ffffff',{font:'bold'});
 if(s.menu==='initials'){
 r.text(String(g.best[g.level])+' points',mx+24,my+100,32,'#edcf72',{font:'num'});
 s.initials.split('').forEach((letter,i)=>{const x=mx+28+i*112;r.roundRect(x,my+145,100,85,5,i===s.letter?'#173953':'#252528');r.text(letter,x+50,my+205,42,'#ffffff',{align:'center',font:'num'});if(i===s.letter)r.fillRect(x+12,my+225,76,3,'#59b9ed');});
 ['Wheel or up/down: change letter','Left/right: move between letters','Press: next letter; third saves'].forEach((t,i)=>r.text(t,mx+24,my+285+i*30,19,'#bdbdc3'));if(s.notice)r.text(s.notice,mx+24,my+409,17,'#f2b179');return r;
 }
 if(s.menu==='confirm')r.text('Current progress will be replaced.',mx+24,my+100,19,'#a6a6ab');
 if(s.menu==='help')['Fill a row to clear it.','Wheel: slide left or right.','Tilt left/right: rotate the piece.','Tilt down: soft drop.','Tilt up: hard drop.','Press or Back to pause.','','Speed increases every 10 lines.'].forEach((t,i)=>r.text(t,mx+24,my+93+i*29,19,'#ceced2'));
 if(s.menu==='scores')Object.keys(LEVELS).forEach((k,i)=>{r.text(LEVELS[k].label+'  '+(g.names[k]||'---'),mx+24,my+120+i*54,23,'#ceced2');r.text(String(g.best[k]),mx+mw-24,my+120+i*54,24,'#edcf72',{align:'right',font:'num'});});
 const start=['scores','help'].includes(s.menu)?my+356:s.menu==='confirm'?my+226:my+87;
 s.labels().forEach((label,i)=>{const y=start+i*47;if(i===s.focus){r.roundRect(mx+12,y,mw-24,41,4,'#173953');r.fillRect(mx+12,y+6,3,29,'#59b9ed');}r.text(label,mx+27,y+28,22,i===s.focus?'#ffffff':'#bdbdc3');});
 if(s.notice)r.text(s.notice,mx+24,my+418,17,'#f2b179');return r;
}
module.exports={draw,WIDTH,HEIGHT};
