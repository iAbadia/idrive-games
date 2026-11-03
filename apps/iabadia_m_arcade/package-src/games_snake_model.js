// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const COLS=28, ROWS=16;
const LEVELS={relaxed:{label:'Relaxed',ms:220},classic:{label:'Classic',ms:150},fast:{label:'Fast',ms:100}};
const DIRS=['up','right','down','left'], STEP=[-COLS,1,COLS,-1];
function valid(s){
 if(!s||s.schema!==1||!LEVELS[s.level]||!['ready','playing','lost','won'].includes(s.status))return false;
 if(!Array.isArray(s.snake)||s.snake.length<3||s.snake.length>COLS*ROWS||new Set(s.snake).size!==s.snake.length||s.snake.some(n=>!Number.isInteger(n)||n<0||n>=COLS*ROWS))return false;
 for(let i=1;i<s.snake.length;i++){const a=s.snake[i-1],b=s.snake[i];if(Math.abs(a%COLS-b%COLS)+Math.abs(Math.floor(a/COLS)-Math.floor(b/COLS))!==1)return false;}
 return Number.isInteger(s.dir)&&s.dir>=0&&s.dir<4&&Number.isInteger(s.score)&&s.score===s.snake.length-3&&
 (s.food===null?s.status==='won':Number.isInteger(s.food)&&s.food>=0&&s.food<COLS*ROWS&&!s.snake.includes(s.food))&&
 Object.keys(LEVELS).every(k=>s.best&&Number.isInteger(s.best[k])&&s.best[k]>=0&&s.best[k]<=COLS*ROWS-3&&s.names&&(s.names[k]===null||/^[A-Z]{3}$/.test(s.names[k])));
}
class Game{
 constructor(saved,random){this.random=random||Math.random;this.best={relaxed:0,classic:0,fast:0};this.names={relaxed:null,classic:null,fast:null};this.newGame('classic');if(valid(saved))Object.assign(this,JSON.parse(JSON.stringify(saved)));this.queue=[];}
 newGame(level){this.level=LEVELS[level]?level:'classic';this.snake=[238,237,236];this.dir=1;this.queue=[];this.score=0;this.status='ready';this.spawn();}
 ended(){return this.status==='lost'||this.status==='won';}
 spawn(){const free=[];for(let i=0;i<COLS*ROWS;i++)if(!this.snake.includes(i))free.push(i);this.food=free.length?free[Math.min(free.length-1,Math.floor(this.random()*free.length))]:null;}
 steer(action,amount){if(this.ended())return;const last=this.queue.length?this.queue[this.queue.length-1]:this.dir;let d;
 if(action==='rotate'){const n=Math.max(-2,Math.min(2,amount||0));for(let i=0;i<Math.abs(n);i++){if(this.queue.length>=2)break;const prev=this.queue.length?this.queue[this.queue.length-1]:this.dir;this.queue.push((prev+(n>0?1:3))%4);}}
 else{d=DIRS.indexOf(action);if(d>=0&&d!==last&&d!==(last+2)%4&&this.queue.length<2)this.queue.push(d);}
 if(action==='rotate'&&amount||d>=0)this.status='playing';
 }
 step(){if(this.status!=='playing')return false;if(this.queue.length)this.dir=this.queue.shift();const head=this.snake[0],next=head+STEP[this.dir],eat=next===this.food;
 const wall=next<0||next>=COLS*ROWS||(this.dir===1&&head%COLS===COLS-1)||(this.dir===3&&head%COLS===0);
 if(wall||this.snake.slice(0,eat?this.snake.length:-1).includes(next)){this.status='lost';return true;}
 this.snake.unshift(next);if(eat){this.score++;this.spawn();if(this.food===null)this.status='won';}else this.snake.pop();return eat;
 }
 snapshot(){return {schema:1,level:this.level,status:this.status,snake:this.snake.slice(),dir:this.dir,score:this.score,food:this.food,best:Object.assign({},this.best),names:Object.assign({},this.names)};}
}
module.exports={Game,LEVELS,COLS,ROWS,DIRS,valid};
