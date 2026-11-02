// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Research only: loads unchanged game adapters against a mocked SDK/renderer.
// It does not launch an HMI, install anything, read saves, or enable ID8 packages.
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm'),EventEmitter=require('events');
const root=path.join(__dirname,'..');
function probe(id,info){
 const base=path.join(root,'apps',id),manifest=require(path.join(base,'mgu-app.json'));let app,gpu,status='';
 const log={info(){},warn(){},error(e){throw Error(e);}};
 class SDK extends EventEmitter{constructor(){super();app=this;this.rhmiApplication={getByName:()=>({setValue:(r,f,text)=>{status=text;return Promise.resolve();}})};}start(){return Promise.resolve();}}
 class GPU extends EventEmitter{constructor(){super();gpu=this;this.frames=0;}fps(){}mode(m){this.selected=m;}place(p){this.placement=p;}show(on){this.shown=on;}grab(on){this.grabbed=on;}frame(){this.frames++;return true;}}
 vm.runInNewContext(fs.readFileSync(path.join(base,'src',id+'.js'),'utf8'),{
  __dirname:path.join(base,manifest.tree,'javascript'),
  require(n){if(n.includes('OnlineApp'))return SDK;if(n.includes('logging'))return{getSDKLogger:()=>log};if(n==='./storage.js')return{load:()=>null,save(){}};if(n==='./mgu_render_client.js')return{RenderClient:GPU};return n.startsWith('./')?require(path.join(base,'src',n)):require(n);},setInterval,clearInterval,setTimeout,clearTimeout,process:{exit(){}}
 });
 app.visible=true;gpu.emit('ready',{},info);
 return{ready:app.ready,shown:!!gpu.shown,grabbing:!!gpu.grabbed,frames:gpu.frames,status};
}
// Proposed negotiation, intentionally not connected to a shipping app.
function candidate(info){
 if(!info||!Array.isArray(info.modes))return null;
 const mode=info.modes.includes('embed')?'embed':info.modes.includes('layer')?'layer':null;
 const b=mode==='embed'?info.embedBox:info.appArea;
 const input=info.controller?'controller':info.touch?'touch':null;
 if(!mode||!input||!b||![b.x,b.y,b.w,b.h].every(Number.isFinite)||b.w<=0||b.h<=0)return null;
 const scale=Math.min(b.w/1280,b.h/480);
 return{mode,input,placement:{x:b.x,y:b.y,w:b.w,h:b.h,scale,ox:(b.w-1280*scale)/2,oy:(b.h-480*scale)/2}};
}
const id7={modes:['layer','embed'],controller:true,touch:true,embedBox:{x:104,y:88,w:1796,h:632}};
const id8={modes:['layer'],controller:false,touch:true,appArea:{x:0,y:76,w:2880,h:764}};
for(const id of ['iabadia_2048','iabadia_minesweeper','iabadia_snake','iabadia_tetris']){
 const current7=probe(id,id7),current8=probe(id,id8),withGate=probe(id,Object.assign({},id8,{controller:true}));
 assert(current7.ready&&current7.shown&&current7.grabbing&&current7.frames);
 assert(!current8.ready&&!current8.shown&&!current8.grabbing&&!current8.frames);
 assert(!withGate.ready&&!withGate.shown); // A controller alone cannot fix the embed requirement.
 console.log(id+': ID7 embed+controller works in mock; ID8 layer+touch rejected; layer+controller also rejected');
 const metadata=require(path.join(root,'apps',id,'release.json'));assert.deepStrictEqual(metadata.mguHmi,['ID7']);
}
assert.equal(candidate(id7).mode,'embed');assert.equal(candidate(id8).mode,'layer');assert.equal(candidate(id8).input,'touch');
assert.equal(candidate(Object.assign({},id8,{controller:true})).input,'controller');
assert.equal(candidate(Object.assign({},id8,{controller:false,touch:false})),null);
assert.equal(candidate({modes:[]}),null);
assert.equal(candidate(Object.assign({},id8,{appArea:{x:0,y:0,w:0,h:764}})),null);
const p=candidate(id8).placement;assert(Math.abs(p.ox-421.33333333333337)<.001);assert.equal(p.oy,0);
console.log('Candidate ID8 placement: '+JSON.stringify(p));
console.log('Research checks passed. No emulator or vehicle was exercised; ID8 remains disabled.');
