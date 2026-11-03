// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const {Recorder}=require('./kit_record.js');const {LEVELS,W,H,SHIP_Y}=require('./game.js');
const WIDTH=1280,HEIGHT=480;
const SPRITES=[['00100100','00011000','01111110','11011011','11111111','00100100','01000010','10000001'],['00111100','01111110','11011011','11111111','10111101','10000001','01000010','00100100']];
const SHIP=['00011000','00011000','00111100','01111110','11111111','11111111','11100111'];
function sprite(r,rows,x,y,scale,color){rows.forEach((line,j)=>{for(let i=0;i<line.length;i++){if(line[i]!=='1')continue;const start=i;while(i+1<line.length&&line[i+1]==='1')i++;r.fillRect(x+(start-4)*scale,y+(j-4)*scale,(i-start+1)*scale,scale,color);}});}
function draw(s,now){
 now=now===undefined?s.now():now;s.advance(now);const g=s.game,r=new Recorder(WIDTH,HEIGHT),bx=475,by=38;
 r.clear('#000000');r.text('Space Invaders',54,83,35,'#eee4da',{font:'bold'});r.text(LEVELS[g.level].label,58,123,22,'#a6a6ab');
 r.text('Score',58,178,20,'#a6a6ab');r.text(String(g.score),56,222,36,'#ffffff',{font:'num'});r.text('Best',237,178,20,'#a6a6ab');r.text(String(g.best[g.level]),235,222,36,'#edcf72',{font:'num'});
 r.text('Wave',58,277,20,'#a6a6ab');r.text(String(g.wave),58,315,31,'#ffffff',{font:'num'});r.text('Lives',237,277,20,'#a6a6ab');for(let i=0;i<g.lives;i++)sprite(r,SHIP,246+i*43,307,3,'#88d7bb');
 r.text('Wheel to move',58,374,24,'#ceced2');r.text('Automatic firing',58,410,21,'#a6a6ab');r.text(s.notice||'Press to pause',58,445,19,s.notice?'#f2b179':'#a6a6ab');
 r.roundRect(bx-6,by-6,W+12,H+12,6,'#252a30');r.fillRect(bx,by,W,H,'#090d12');
 for(let i=0;i<30;i++)r.fillRect(bx+((i*113+47)%W),by+((i*73+19)%(H-45)),1,1,'#34404d');
 const frame=Math.floor(g.time/350)%2;g.enemies.forEach(e=>sprite(r,SPRITES[(frame+e.row)%2],bx+e.x,by+e.y,3,['#b8a2de','#8cc9e5','#8cc9e5','#8fd3ac','#8fd3ac'][e.row]));
 g.shields.forEach(v=>r.fillRect(bx+v.x,by+v.y,7,7,v.hp===2?'#5a9985':'#365c51'));
 g.bullets.forEach(v=>{const x=bx+v.x,y=by+v.y;if(v.enemy){r.line(x-2,y-5,x+2,y,2,'#f19a83');r.line(x+2,y,x-2,y+5,2,'#f19a83');}else r.fillRect(x-1,y-5,3,10,'#ece5cf');});
 if(!g.ended()&&(!g.immune||Math.floor(g.time/110)%2===0||g.status==='ready'))sprite(r,SHIP,bx+g.player,by+SHIP_Y,3,'#88d7bb');
 g.effects.forEach(v=>{const t=(g.time-v.at)/230,size=5+t*13,c=[245,190,121,Math.round(230*(1-t))];r.line(bx+v.x-size,by+v.y-size,bx+v.x+size,by+v.y+size,2,c);r.line(bx+v.x-size,by+v.y+size,bx+v.x+size,by+v.y-size,2,c);});
 r.line(bx,by+H-9,bx+W,by+H-9,1,'#34483f');
 if(!s.menu&&g.status==='ready'){r.roundRect(bx+130,by+207,500,66,5,[0,0,0,230]);r.text('Turn the wheel to defend Earth',bx+380,by+248,25,'#ffffff',{font:'bold',align:'center'});}
 if(!s.menu)return r;r.fillRect(bx,by,W,H,[0,0,0,100]);
 const mx=30,my=24,mw=390;r.roundRect(mx,my,mw,432,7,'#141416');
 r.text({initials:'New high score',pause:'Paused',lost:'Earth overrun',won:'Board cleared',confirm:'Start a new game?',difficulty:'Difficulty',scores:'High scores',help:'How to play'}[s.menu],mx+24,my+51,29,'#ffffff',{font:'bold'});
 if(s.menu==='initials'){
 r.text(String(g.best[g.level])+' points',mx+24,my+100,32,'#edcf72',{font:'num'});
 s.initials.split('').forEach((letter,i)=>{const x=mx+28+i*112;r.roundRect(x,my+145,100,85,5,i===s.letter?'#173953':'#252528');r.text(letter,x+50,my+205,42,'#ffffff',{align:'center',font:'num'});if(i===s.letter)r.fillRect(x+12,my+225,76,3,'#59b9ed');});
 ['Wheel or up/down: change letter','Left/right: move between letters','Press: next letter; third saves'].forEach((t,i)=>r.text(t,mx+24,my+285+i*30,19,'#bdbdc3'));if(s.notice)r.text(s.notice,mx+24,my+409,17,'#f2b179');return r;
 }
 if(s.menu==='confirm')r.text('Current progress will be replaced.',mx+24,my+100,19,'#a6a6ab');
 if(s.menu==='help')['Wheel: move the ship left/right.','Tilt left/right also moves.','Your ship fires automatically.','Press or Back to pause.','','Clear each formation to advance.','Shields absorb shots on both sides.','Three hits end the game.'].forEach((t,i)=>r.text(t,mx+24,my+93+i*29,19,'#ceced2'));
 if(s.menu==='scores')Object.keys(LEVELS).forEach((k,i)=>{r.text(LEVELS[k].label+'  '+(g.names[k]||'---'),mx+24,my+120+i*54,23,'#ceced2');r.text(String(g.best[k]),mx+mw-24,my+120+i*54,24,'#edcf72',{align:'right',font:'num'});});
 const start=['scores','help'].includes(s.menu)?my+356:s.menu==='confirm'?my+226:my+87;
 s.labels().forEach((label,i)=>{const y=start+i*47;if(i===s.focus){r.roundRect(mx+12,y,mw-24,41,4,'#173953');r.fillRect(mx+12,y+6,3,29,'#59b9ed');}r.text(label,mx+27,y+28,22,i===s.focus?'#ffffff':'#bdbdc3');});
 if(s.notice)r.text(s.notice,mx+24,my+418,17,'#f2b179');return r;
}
module.exports={draw,WIDTH,HEIGHT,sprite,SPRITES,SHIP};
