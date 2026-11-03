// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const W=760,H=400,SHIP_Y=374;
const LEVELS={relaxed:{label:'Relaxed',speed:.7,fire:1200},classic:{label:'Classic',speed:1,fire:900},fast:{label:'Fast',speed:1.35,fire:650}};
const bounded=(v,a,z)=>Number.isFinite(v)&&v>=a&&v<=z;
const integer=(v,a,z)=>Number.isSafeInteger(v)&&v>=a&&v<=z;
function valid(s){
 if(!s||s.schema!==1||!LEVELS[s.level]||!['ready','playing','lost'].includes(s.status))return false;
 if(!integer(s.score,0,1e9)||!integer(s.wave,1,10000)||!integer(s.lives,0,3)||![-1,1].includes(s.dir)||!bounded(s.player,14,W-14)||!bounded(s.target,14,W-14))return false;
 if(!['time','shotClock','enemyClock','immune'].every(k=>bounded(s[k],0,1e12)))return false;
 if(!Array.isArray(s.enemies)||s.enemies.length>40||!s.enemies.every(e=>e&&integer(e.row,0,4)&&integer(e.col,0,7)&&bounded(e.x,0,W)&&bounded(e.y,0,H))||new Set(s.enemies.map(e=>e.row*8+e.col)).size!==s.enemies.length)return false;
 if(!Array.isArray(s.bullets)||s.bullets.length>40||!s.bullets.every(v=>v&&typeof v.enemy==='boolean'&&bounded(v.x,0,W)&&bounded(v.y,-20,H+20)))return false;
 if(!Array.isArray(s.shields)||s.shields.length>144||!s.shields.every(v=>v&&integer(v.x,0,W)&&integer(v.y,0,H)&&integer(v.hp,1,2))||new Set(s.shields.map(v=>v.x+','+v.y)).size!==s.shields.length)return false;
 return Object.keys(LEVELS).every(k=>s.best&&integer(s.best[k],0,1e9)&&s.names&&(s.names[k]===null||/^[A-Z]{3}$/.test(s.names[k])));
}
class Game{
 constructor(saved,random){this.random=random||Math.random;this.best={relaxed:0,classic:0,fast:0};this.names={relaxed:null,classic:null,fast:null};this.newGame('classic');if(valid(saved))Object.assign(this,JSON.parse(JSON.stringify(saved)));this.effects=[];}
 newGame(level){this.level=LEVELS[level]?level:'classic';this.status='ready';this.score=0;this.wave=1;this.lives=3;this.player=this.target=W/2;this.time=0;this.immune=0;this.effects=[];this.setupWave();}
 setupWave(){this.dir=1;this.bullets=[];this.shotClock=0;this.enemyClock=0;this.enemies=[];
  for(let row=0;row<5;row++)for(let col=0;col<8;col++)this.enemies.push({row,col,x:130+col*54,y:38+row*34});
  this.shields=[];for(const center of [130,300,470,640])for(let y=0;y<4;y++)for(let x=0;x<8;x++){
   if(y===0&&(x===0||x===7)||y>=2&&x>=3&&x<=4)continue;
   this.shields.push({x:center-32+x*8,y:302+y*8,hp:2});
  }
  this.immune=1400;
 }
 ended(){return this.status==='lost';}
 steer(action,amount){if(this.ended())return;let dx=action==='rotate'?Math.max(-24,Math.min(24,amount||0))*18:action==='left'?-48:action==='right'?48:0;
  if(!dx)return;this.status='playing';this.target=Math.max(14,Math.min(W-14,this.target+dx));
 }
 fireEnemy(){const front={};this.enemies.forEach(e=>{if(!front[e.col]||front[e.col].row<e.row)front[e.col]=e;});const choices=Object.keys(front).map(k=>front[k]);if(!choices.length)return;const e=choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))];if(this.bullets.filter(b=>b.enemy).length<8)this.bullets.push({x:e.x,y:e.y+10,enemy:true});}
 hitShield(b,old){const s=this.shields.filter(v=>b.x>=v.x-2&&b.x<=v.x+10&&Math.min(old,b.y)<=v.y+8&&Math.max(old,b.y)>=v.y).sort((a,z)=>b.enemy?a.y-z.y:z.y-a.y)[0];if(!s)return false;s.hp--;this.shields=this.shields.filter(v=>v.hp>0);return true;}
 tick(ms){if(this.status!=='playing')return false;ms=Math.max(0,Math.min(50,ms));const dt=ms/1000,d=LEVELS[this.level];this.time+=ms;this.immune=Math.max(0,this.immune-ms);this.effects=this.effects.filter(v=>this.time-v.at<230);
  const delta=this.target-this.player;this.player+=Math.sign(delta)*Math.min(Math.abs(delta),520*dt);
  this.shotClock+=ms;this.enemyClock+=ms;
  if(this.shotClock>=300){this.shotClock=0;if(this.bullets.filter(b=>!b.enemy).length<3)this.bullets.push({x:this.player,y:SHIP_Y-13,enemy:false});}
  if(this.enemyClock>=Math.max(300,d.fire-this.wave*25)){this.enemyClock=0;this.fireEnemy();}
  let changed=false;const speed=(22+this.wave*4+(40-this.enemies.length)*1.5)*d.speed;
  if(this.enemies.length){const edge=this.enemies.some(e=>e.x+this.dir*speed*dt<14||e.x+this.dir*speed*dt>W-14);if(edge){this.dir=-this.dir;this.enemies.forEach(e=>e.y+=12);}else this.enemies.forEach(e=>e.x+=this.dir*speed*dt);}
  const next=[];for(const b of this.bullets){const old=b.y;b.y+=(b.enemy?155+this.wave*8:-450)*dt;
   if(this.hitShield(b,old)){changed=true;continue;}
   if(!b.enemy){const hit=this.enemies.filter(e=>Math.abs(b.x-e.x)<=14&&b.y<=e.y+10&&old>=e.y-10).sort((a,z)=>z.y-a.y)[0],index=this.enemies.indexOf(hit);
    if(index>=0){const e=this.enemies.splice(index,1)[0];this.score+=[40,30,20,10,10][e.row];this.effects.push({x:e.x,y:e.y,at:this.time});changed=true;continue;}}
   else if(Math.abs(b.x-this.player)<=14&&old<=SHIP_Y+8&&b.y>=SHIP_Y-10){
    if(!this.immune){this.lives--;this.immune=1600;this.effects.push({x:this.player,y:SHIP_Y,at:this.time});changed=true;if(!this.lives)this.status='lost';}
    continue;
   }
   if(b.y>=-12&&b.y<=H+12)next.push(b);
  }this.bullets=next;
  this.shields=this.shields.filter(v=>!this.enemies.some(e=>Math.abs(e.x-(v.x+4))<18&&Math.abs(e.y-(v.y+4))<14));
  if(this.enemies.some(e=>e.y>=SHIP_Y-16)){this.lives=0;this.status='lost';changed=true;}
  if(!this.enemies.length&&!this.ended()){this.score+=200;this.wave++;this.setupWave();changed=true;}
  return changed;
 }
 snapshot(){const s={schema:1};for(const k of ['level','status','score','wave','lives','dir','player','target','time','shotClock','enemyClock','immune','enemies','bullets','shields','best','names'])s[k]=JSON.parse(JSON.stringify(this[k]));return s;}
}
module.exports={Game,LEVELS,W,H,SHIP_Y,valid};
