// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Offline documentation only. Uses the actual Session, controller inputs and draw code.
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const root=path.join(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'idrive-gallery-'));
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function capture(id,seconds,setup,act,shot){
 const base=path.join(root,'apps','iabadia_'+id),{Session}=require(path.join(base,'src/session.js'));
 const {draw,WIDTH,HEIGHT}=require(path.join(base,'src/draw.js')),{Canvas}=require(path.join(base,'src/kit_canvas.js')),{play}=require(path.join(base,'src/kit_record.js'));
 let now=0;const s=new Session(null,{now:()=>now,random:rng(42)});s.visibility(true);
 setup(s,()=>now,v=>now=v);const dir=path.join(temp,id);fs.mkdirSync(dir);let screenshot;
 for(let f=0;f<seconds*20;f++){
  s.advance(now);act(s,f);const png=play(draw(s,now).words(),new Canvas(WIDTH,HEIGHT)).png();
  fs.writeFileSync(path.join(dir,String(f).padStart(4,'0')+'.png'),png);
  if(f===shot){screenshot=path.join(base,'preview/game.png');fs.writeFileSync(screenshot,png);}
  now+=50;
 }
 if(s.menu)throw Error(id+' demo ended unexpectedly: '+s.menu);
 console.log(id+': '+seconds+'s recorded'+(s.game.score===undefined?'':'; score '+s.game.score)+(s.game.lines===undefined?'':', lines '+s.game.lines));
 return {id,dir,screenshot};
}
const records=[];
records.push(capture('2048',6,(s,get,set)=>{
 for(let i=0;i<32;i++){s.input(['left','down','left','up','right'][i%5]);set(get()+400);s.advance();}
},(s,f)=>{if(f%16===0)s.input(['left','down','right','up'][Math.floor(f/16)%4]);},95));
// The pilot follows legal paths to random food, then steers through normal wheel input.
function snakeTurn(s){
 const g=s.game,start=g.snake[0],dirs=[-28,1,28,-1],queue=[[start,[]]],seen=new Set([start]);let route;
 for(let i=0;i<queue.length;i++){
  const [cell,steps]=queue[i];if(cell===g.food){route=steps;break;}
  for(let d=0;d<4;d++){
   if(!steps.length&&d===(g.dir+2)%4)continue;const n=cell+dirs[d];
   if(n<0||n>=448||(d===1&&cell%28===27)||(d===3&&cell%28===0)||seen.has(n)||g.snake.slice(0,-1).includes(n))continue;
   seen.add(n);queue.push([n,steps.concat(d)]);
  }
 }
 const desired=route&&route[0];if(desired===undefined)return;
 const turn=(desired-g.dir+4)%4;if(turn===1)s.input('rotate',1);if(turn===3)s.input('rotate',-1);
}
records.push(capture('snake',8,(s)=>{
 s.game.random=()=>.5375;s.game.newGame('classic');s.input('right');
},(s)=>{if(s.game.queue.length===0)snakeTurn(s);},130));
let mineGoal=null,minePhase='flag',flagged=false;
records.push(capture('minesweeper',8,s=>{s.game.random=rng(1);s.game.cursor=40;s.input('center');},(s,f)=>{
 if(f%6)return;const g=s.game;
 if(mineGoal===null){
  const choices=minePhase==='flag'?g.mines.filter(n=>!g.flags[n]):g.revealed.map((v,i)=>!v&&!g.mines.includes(i)?i:-1).filter(i=>i>=0);
  choices.sort((a,b)=>(Math.abs(a%9-g.cursor%9)+Math.abs(Math.floor(a/9)-Math.floor(g.cursor/9)))-(Math.abs(b%9-g.cursor%9)+Math.abs(Math.floor(b/9)-Math.floor(g.cursor/9))));
  mineGoal=choices[0];if(mineGoal===undefined)return;
 }
 if(g.cursor!==mineGoal){const dx=mineGoal%9-g.cursor%9,dy=Math.floor(mineGoal/9)-Math.floor(g.cursor/9);s.input(dx?(dx>0?'right':'left'):(dy>0?'down':'up'));return;}
 if(minePhase==='flag'&&s.mode===0){s.input('rotate',1);return;}
 if(minePhase==='reveal'&&s.mode===1){s.input('rotate',-1);return;}
 s.input('center');mineGoal=null;if(minePhase==='flag'){flagged=true;minePhase='reveal';}else minePhase=flagged?'flag':'reveal';
},120));
// Choose placements by simulating legal rotations/movement in a separate Game.
function placement(g){
 const {Game,cells,fits}=require('../apps/iabadia_tetris/src/game.js');let best;
 for(let rot=0;rot<4;rot++)for(let x=-2;x<10;x++){
  const h=new Game(g.snapshot(),()=>.4);let ok=true;
  for(let i=0;i<rot;i++)if(!h.rotate(1))ok=false;
  const dx=x-h.piece.x;for(let i=0;i<Math.abs(dx);i++)if(!h.move(Math.sign(dx)))ok=false;
  if(!ok||h.piece.x!==x||!fits(h.board,h.piece))continue;
  h.piece=h.ghost();h.place();if(h.ended())continue;
  const heights=[],holes=[];for(let c=0;c<10;c++){let top=20,n=0;for(let y=0;y<20;y++){if(h.board[y*10+c])top=Math.min(top,y);else if(top<20)n++;}heights.push(20-top);holes.push(n);}
  const cost=holes.reduce((a,b)=>a+b,0)*12+heights.reduce((a,b)=>a+b,0)*.5+heights.slice(1).reduce((a,b,i)=>a+Math.abs(b-heights[i]),0)*.7-h.cleared.length*8;
  if(!best||cost<best.cost)best={rot,x,cost};
 }return best;
}
let plan;
records.push(capture('tetris',10,s=>{
 // Warm-up is played by the same legal controls; no hand-painted board.
 for(let i=0;i<10;i++){const p=placement(s.game);for(let r=0;r<p.rot;r++)s.input('right');s.input('rotate',p.x-s.game.piece.x);s.input('up');}
 s.stamp=s.now();
},(s,f)=>{
 const phase=f%24;if(phase===0)plan=placement(s.game);
 if(phase===2&&plan)for(let r=0;r<plan.rot;r++)s.input('right');
 if(phase===5&&plan)s.input('rotate',plan.x-s.game.piece.x);
 if(phase>=8&&phase<=18&&phase%2===0)s.input('down');
 if(phase===20)s.input('up');
},175));
try{
 const out=path.join(root,'docs/media');fs.mkdirSync(out,{recursive:true});
 const r=cp.spawnSync(process.env.PYTHON||'python',[path.join(__dirname,'encode_gallery.py'),temp,out],{stdio:'inherit'});
 if(r.status!==0)throw Error('GIF encoding failed; install Python Pillow');
}catch(e){console.error('Frames retained at '+temp);throw e;}
fs.rmSync(temp,{recursive:true,force:true});
