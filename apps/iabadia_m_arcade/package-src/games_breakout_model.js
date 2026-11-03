// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const W=760,H=400,R=5,PADDLE_Y=374,BW=64,BH=18;
const LEVELS={relaxed:{label:'Relaxed',width:132,speed:240},classic:{label:'Classic',width:112,speed:290},fast:{label:'Fast',width:94,speed:340}};
const clamp=(v,a,z)=>Math.max(a,Math.min(z,v));
const bounded=(v,a,z)=>Number.isFinite(v)&&v>=a&&v<=z;
const integer=(v,a,z)=>Number.isSafeInteger(v)&&v>=a&&v<=z;
function brickBox(b){return{x:26+b.col*71,y:38+b.row*26,w:BW,h:BH};}
function collision(ball,box){
 const x=clamp(ball.x,box.x,box.x+box.w),y=clamp(ball.y,box.y,box.y+box.h),dx=ball.x-x,dy=ball.y-y,d=Math.sqrt(dx*dx+dy*dy);
 if(d>=R)return null;
 if(d>0)return{nx:dx/d,ny:dy/d,depth:R-d};
 const options=[{nx:-1,ny:0,depth:ball.x-box.x+R},{nx:1,ny:0,depth:box.x+box.w-ball.x+R},{nx:0,ny:-1,depth:ball.y-box.y+R},{nx:0,ny:1,depth:box.y+box.h-ball.y+R}];return options.sort((a,b)=>a.depth-b.depth)[0];
}
function valid(s){
 if(!s||s.schema!==1||!LEVELS[s.level]||!['ready','playing','lost'].includes(s.status))return false;
 const half=LEVELS[s.level].width/2;
 if(!integer(s.score,0,1e9)||!integer(s.wave,1,10000)||!integer(s.lives,0,3)||!bounded(s.paddle,half,W-half)||!bounded(s.target,half,W-half)||!bounded(s.time,0,1e12)||!bounded(s.serve,0,1500))return false;
 const a=s.ball;if(!a||!bounded(a.x,R,W-R)||!bounded(a.y,R,H+R+5)||!bounded(a.vx,-600,600)||!bounded(a.vy,-600,600))return false;
 if(!s.serve&&s.status==='playing'&&Math.hypot(a.vx,a.vy)<100)return false;
 if(!Array.isArray(s.bricks)||!s.bricks.length||s.bricks.length>60||!s.bricks.every(v=>v&&integer(v.row,0,5)&&integer(v.col,0,9)&&integer(v.hp,1,2))||new Set(s.bricks.map(v=>v.row*10+v.col)).size!==s.bricks.length)return false;
 return Object.keys(LEVELS).every(k=>s.best&&integer(s.best[k],0,1e9)&&s.names&&(s.names[k]===null||/^[A-Z]{3}$/.test(s.names[k])));
}
class Game{
 constructor(saved,random){this.random=random||Math.random;this.best={relaxed:0,classic:0,fast:0};this.names={relaxed:null,classic:null,fast:null};this.newGame('classic');if(valid(saved))Object.assign(this,JSON.parse(JSON.stringify(saved)));this.trail=[];this.effects=[];}
 get width(){return LEVELS[this.level].width;}
 get speed(){return Math.min(520,LEVELS[this.level].speed+(this.wave-1)*16);}
 newGame(level){this.level=LEVELS[level]?level:'classic';this.status='ready';this.score=0;this.wave=1;this.lives=3;this.time=0;this.paddle=this.target=W/2;this.trail=[];this.effects=[];this.setupWave();}
 setupWave(){this.bricks=[];for(let row=0;row<6;row++)for(let col=0;col<10;col++)this.bricks.push({row,col,hp:row<2?2:1});this.resetBall();}
 resetBall(){this.serve=1100;this.ball={x:this.paddle,y:PADDLE_Y-R-1,vx:0,vy:0};this.trail=[];}
 ended(){return this.status==='lost';}
 steer(action,amount){if(this.ended())return;const dx=action==='rotate'?clamp(amount||0,-24,24)*20:action==='left'?-52:action==='right'?52:0;if(!dx)return;this.status='playing';this.target=clamp(this.target+dx,this.width/2,W-this.width/2);}
 launch(){const sign=this.random()<.5?-1:1;this.ball.vx=this.speed*.35*sign;this.ball.vy=-Math.sqrt(this.speed*this.speed-this.ball.vx*this.ball.vx);}
 tick(ms){if(this.status!=='playing')return false;ms=clamp(ms,0,50);this.time+=ms;this.effects=this.effects.filter(v=>this.time-v.at<180);let changed=false;
  if(this.serve>0){this.paddle+=Math.sign(this.target-this.paddle)*Math.min(Math.abs(this.target-this.paddle),700*ms/1000);this.ball.x=this.paddle;this.ball.y=PADDLE_Y-R-1;this.serve=Math.max(0,this.serve-ms);if(!this.serve)this.launch();return false;}
  this.trail.push({x:this.ball.x,y:this.ball.y});if(this.trail.length>9)this.trail.shift();
  // Small collision steps avoid tunneling through bricks or the paddle at high speed.
  for(let left=ms;left>0;){const step=Math.min(5,left),dt=step/1000;left-=step;
   this.paddle+=Math.sign(this.target-this.paddle)*Math.min(Math.abs(this.target-this.paddle),700*dt);
   const a=this.ball,oldY=a.y;a.x+=a.vx*dt;a.y+=a.vy*dt;
   if(a.x<R){a.x=R;a.vx=Math.abs(a.vx);}else if(a.x>W-R){a.x=W-R;a.vx=-Math.abs(a.vx);}
   if(a.y<R){a.y=R;a.vy=Math.abs(a.vy);}
   if(a.vy>0&&oldY+R<=PADDLE_Y+1&&a.y+R>=PADDLE_Y&&Math.abs(a.x-this.paddle)<=this.width/2+R){
    const speed=Math.hypot(a.vx,a.vy),angle=clamp((a.x-this.paddle)/(this.width/2),-.92,.92)*Math.PI/3;
    a.vx=Math.sin(angle)*speed;if(Math.abs(a.vx)<speed*.12)a.vx=(a.vx<0?-1:1)*speed*.12;
    a.vy=-Math.sqrt(speed*speed-a.vx*a.vx);a.y=PADDLE_Y-R-.01;
   }
   for(let i=0;i<this.bricks.length;i++){
    const brick=this.bricks[i],c=collision(a,brickBox(brick));if(!c)continue;
    a.x+=c.nx*(c.depth+.01);a.y+=c.ny*(c.depth+.01);
    const dot=a.vx*c.nx+a.vy*c.ny;if(dot>=0)continue;
    a.vx-=2*dot*c.nx;a.vy-=2*dot*c.ny;brick.hp--;changed=true;
    this.effects.push(Object.assign(brickBox(brick),{at:this.time}));
    if(!brick.hp){this.score+=(6-brick.row)*10;this.bricks.splice(i,1);}else this.score+=5;
    const speed=Math.hypot(a.vx,a.vy),next=Math.min(520,speed+1.5);a.vx*=next/speed;a.vy*=next/speed;
    break;
   }
   if(!this.bricks.length){this.score+=200;this.wave++;this.setupWave();return true;}
   if(a.y-R>H){this.lives--;changed=true;if(!this.lives){this.status='lost';a.y=H+R+1;}else this.resetBall();break;}
  }return changed;
 }
 snapshot(){const s={schema:1};for(const k of ['level','status','score','wave','lives','time','paddle','target','serve','ball','bricks','best','names'])s[k]=JSON.parse(JSON.stringify(this[k]));return s;}
}
module.exports={Game,LEVELS,W,H,R,PADDLE_Y,BW,BH,brickBox,collision,valid};
