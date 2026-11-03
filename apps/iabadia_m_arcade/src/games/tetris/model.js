// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const COLS=10,ROWS=20;
const LEVELS={relaxed:{label:'Relaxed',ms:1000},classic:{label:'Classic',ms:800},fast:{label:'Fast',ms:500}};
const KINDS=['I','J','L','O','S','T','Z'];
const SHAPES={I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],J:[[1,0,0],[1,1,1],[0,0,0]],L:[[0,0,1],[1,1,1],[0,0,0]],O:[[1,1],[1,1]],S:[[0,1,1],[1,1,0],[0,0,0]],T:[[0,1,0],[1,1,1],[0,0,0]],Z:[[1,1,0],[0,1,1],[0,0,0]]};
function cells(p){let m=SHAPES[p.kind];for(let i=0;i<p.rot;i++)m=m[0].map((_,x)=>m.map(row=>row[x]).reverse());const out=[];m.forEach((row,y)=>row.forEach((v,x)=>{if(v)out.push([p.x+x,p.y+y]);}));return out;}
function fits(board,p){return cells(p).every(([x,y])=>x>=0&&x<COLS&&y<ROWS&&(y<0||!board[y*COLS+x]));}
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
function valid(s){
 if(!s||s.schema!==1||!LEVELS[s.level]||!['ready','playing','lost'].includes(s.status))return false;
 if(!Array.isArray(s.board)||s.board.length!==COLS*ROWS||s.board.some(v=>!integer(v,0,7)))return false;
 for(let y=0;y<ROWS;y++)if(s.board.slice(y*10,y*10+10).every(Boolean))return false;
 const p=s.piece;if(!p||!KINDS.includes(p.kind)||!integer(p.rot,0,3)||!integer(p.x,-4,10)||!integer(p.y,-4,20))return false;
 if(s.status!=='lost'&&!fits(s.board,p))return false;
 return integer(s.score,0,Number.MAX_SAFE_INTEGER)&&integer(s.lines,0,10000000)&&Array.isArray(s.bag)&&s.bag.length<=7&&new Set(s.bag).size===s.bag.length&&s.bag.every(k=>KINDS.includes(k))&&Array.isArray(s.next)&&s.next.length===3&&s.next.every(k=>KINDS.includes(k))&&Object.keys(LEVELS).every(k=>s.best&&integer(s.best[k],0,Number.MAX_SAFE_INTEGER)&&s.names&&(s.names[k]===null||/^[A-Z]{3}$/.test(s.names[k])));
}
class Game{
 constructor(saved,random){this.random=random||Math.random;this.best={relaxed:0,classic:0,fast:0};this.names={relaxed:null,classic:null,fast:null};this.newGame('classic');if(valid(saved))Object.assign(this,JSON.parse(JSON.stringify(saved)));this.fall=0;this.lock=0;this.resets=0;this.cleared=[];}
 take(){if(!this.bag.length){this.bag=KINDS.slice();for(let i=6;i>0;i--){const j=Math.min(i,Math.floor(this.random()*(i+1)));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}}return this.bag.pop();}
 newGame(level){this.level=LEVELS[level]?level:'classic';this.board=Array(200).fill(0);this.bag=[];this.next=[this.take(),this.take(),this.take()];this.score=0;this.lines=0;this.status='ready';this.cleared=[];this.spawn();}
 spawn(){const kind=this.next.shift();this.next.push(this.take());this.piece={kind,rot:0,x:kind==='O'?4:3,y:0};this.fall=0;this.lock=0;this.resets=0;if(!fits(this.board,this.piece))this.status='lost';}
 ended(){return this.status==='lost';}
 get stage(){return 1+Math.floor(this.lines/10);}
 get delay(){return Math.max(80,LEVELS[this.level].ms*Math.pow(.82,this.stage-1));}
 grounded(){return !fits(this.board,Object.assign({},this.piece,{y:this.piece.y+1}));}
 adjust(p){if(!fits(this.board,p))return false;const ground=this.grounded();this.piece=p;if(ground&&this.resets<10){this.lock=0;this.resets++;}return true;}
 move(dx){return this.adjust(Object.assign({},this.piece,{x:this.piece.x+dx}));}
 rotate(dir){if(this.piece.kind==='O')return false;const p=Object.assign({},this.piece,{rot:(this.piece.rot+dir+4)%4});for(const [x,y] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[0,-2]])if(this.adjust(Object.assign({},p,{x:p.x+x,y:p.y+y})))return true;return false;}
 ghost(){let p=Object.assign({},this.piece);while(fits(this.board,Object.assign({},p,{y:p.y+1})))p.y++;return p;}
 place(){const c=cells(this.piece);if(c.some(p=>p[1]<0)){this.status='lost';return true;}c.forEach(([x,y])=>this.board[y*10+x]=KINDS.indexOf(this.piece.kind)+1);
 const rows=[];this.cleared=[];for(let y=0;y<20;y++){const row=this.board.slice(y*10,y*10+10);if(row.every(Boolean))this.cleared.push(y);else rows.push(row);}
 const n=this.cleared.length;this.score+=[0,100,300,500,800][n]*this.stage;this.lines+=n;while(rows.length<20)rows.unshift(Array(10).fill(0));this.board=[].concat(...rows);this.spawn();return true;
 }
 tick(ms){if(this.status!=='playing')return false;ms=Math.max(0,Math.min(100,ms));this.fall+=ms;if(this.fall>=this.delay){this.fall=0;if(!this.grounded()){this.piece.y++;this.lock=0;}}if(this.grounded()){this.lock+=ms;if(this.lock>=500)return this.place();}else this.lock=0;return false;}
 action(action,amount){if(this.ended())return false;if(this.status==='ready')this.status='playing';
 if(action==='rotate'){for(let i=0;i<Math.min(10,Math.abs(amount||0));i++)this.move(amount>0?1:-1);}
 else if(action==='left'||action==='right')this.rotate(action==='right'?1:-1);
 else if(action==='down'&&!this.grounded()){this.piece.y++;this.score++;this.lock=0;}
 else if(action==='up'){const p=this.ghost();this.score+=2*(p.y-this.piece.y);this.piece=p;return this.place();}return false;
 }
 snapshot(){const s={schema:1,level:this.level,status:this.status,board:this.board.slice(),piece:Object.assign({},this.piece),bag:this.bag.slice(),next:this.next.slice(),score:this.score,lines:this.lines,best:Object.assign({},this.best),names:Object.assign({},this.names)};return s;}
}
module.exports={Game,LEVELS,COLS,ROWS,KINDS,cells,fits,valid};
