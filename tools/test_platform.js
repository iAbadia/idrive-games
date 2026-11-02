// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm'),EventEmitter=require('events');
const {host,sample,DirectController}=require('../shared/platform.js');
const root=path.join(__dirname,'..');
const pause=()=>new Promise(r=>setTimeout(r,2));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await pause();}throw Error('Timed out');}
const id7={modes:['layer','embed'],controller:true,embedBox:{x:104,y:88,w:1796,h:632},appArea:{x:108,y:82,w:1790,h:638}};
const id8={modes:['layer'],controller:true,appArea:{x:0,y:76,w:2880,h:764}};
function policy(){
 assert.equal(host(id7,'ID7',1280,480).mode,'embed');assert.equal(host(id7,'ID8',1280,480).mode,'layer');
 const p=host(id8,'ID8',1280,480).placement;assert(Math.abs(p.scale-764/480)<1e-9);assert(Math.abs(p.ox-421.33333333333337)<.001);assert.equal(p.oy,0);
 assert.equal(host({modes:['embed'],embedBox:id7.embedBox},'ID8',1280,480),null);
 assert.equal(host({modes:[]},'ID7',1280,480),null);assert.equal(host({modes:['layer'],appArea:{x:0,y:0,w:0,h:10}},'ID8',1280,480),null);
 const fallback=host({modes:['embed','layer'],embedBox:{},appArea:id8.appArea},'ID7',1280,480);assert.equal(fallback.mode,'layer');
 assert.deepStrictEqual(sample({frontRotaryEncoderOperation:3,frontRotaryEncoderDeflection:'WEST_LANG_GEDRUECKT',frontRotaryEncoderPushButton:'DREHGEBER_KURZ_GEDRUECKT'}),{knob:3,tilt:11,press:1});
 assert.deepStrictEqual(sample({}),{knob:65535,tilt:15,press:15});
 console.log('ok platform geometry, mode fallback and named/numeric input normalization');
}
async function lifecycle(id,hmi,direct){
 let app,gpu,callback,unsubscribed=0,saved,statusText='',sourceError=false;
 const states=[new EventEmitter(),new EventEmitter(),new EventEmitter()];states.forEach(s=>s.updateResources=()=>Promise.resolve());
 const status={setValue:(row,key,text)=>{statusText=text;return Promise.resolve();}};
 const rhmi=new EventEmitter();rhmi.getByName=n=>n==='gameTitleID8'?(hmi==='ID8'?{}:null):n==='gameStatus'?status:states[n.endsWith('_Detail')?2:n.endsWith('_Menu')?1:0];
 const closed=[];rhmi.openState=()=>Promise.resolve();rhmi.closeState=n=>{closed.push(n);return Promise.resolve();};rhmi.mapEntryState=()=>Promise.resolve();rhmi.openEntryState=()=>Promise.resolve();
 const entry={uuid:'entry',textId:'title',icon:'icon.png'},ep={getDescription:()=>entry,init:()=>Promise.resolve(),setAvailability:()=>Promise.resolve(),entryPoint:{setText:()=>Promise.resolve(),setIcon:()=>Promise.resolve()}};
 class SDK extends EventEmitter{
  constructor(){super();app=this;this.rhmiApplication=rhmi;this.appDescription={application:{entryPoints:[entry]}};this.startReason='ENTRY_POINT';}
  start(){this.emit('initialized');return Promise.resolve();}initialized(){return Promise.resolve();}getEntryPoints(){return[ep];}getLastExecutedEntryPointUuid(){return'entry';}registerActive(){return Promise.resolve();}destroyBundles(){return Promise.resolve();}
 }
 const builders={buildTypedProxy:(name,instance)=>{assert.equal(instance,'1');assert(name.endsWith('.FrontCCU'));if(sourceError)return Promise.reject(Error('unavailable'));return Promise.resolve({init:()=>Promise.resolve(),waitUntilAvailable:()=>Promise.resolve(),statusRotaryEncoderState:{subscribe:cb=>{callback=cb;return Promise.resolve(17);},unsubscribe:token=>{assert.equal(token,17);unsubscribed++;return Promise.resolve();}}});}};
 class Input extends DirectController{constructor(deliver){super(deliver,builders);}}
 class GPU extends EventEmitter{constructor(){super();gpu=this;this.frames=0;}fps(){}connect(){this.connected=true;}mode(v){this.selected=v;}place(p){this.placement=p;}show(on){this.shown=on;}grab(on){this.grabbed=on;}frame(){this.frames++;return true;}close(){this.closed=true;}}
 const base=path.join(root,'apps',id),m=require(path.join(base,'mgu-app.json'));
 assert.equal(fs.readFileSync(path.join(base,'src/platform.js'),'utf8'),fs.readFileSync(path.join(root,'shared/platform.js'),'utf8'));
 const log={info(){},warn(){},error(e){throw Error(e);}};
 vm.runInNewContext(fs.readFileSync(path.join(base,'src',id+'.js'),'utf8'),{__dirname:path.join(base,m.tree,'javascript'),
  require(n){if(n.includes('OnlineApp'))return SDK;if(n.includes('logging'))return{getSDKLogger:()=>log};if(n==='./storage.js')return{load:()=>null,save:(file,v)=>saved=v};if(n==='./mgu_render_client.js')return{RenderClient:GPU};if(n==='./platform.js')return{host,DirectController:Input};return n.startsWith('./')?require(path.join(base,'src',n)):require(n);},setTimeout,clearTimeout,setInterval,clearInterval,process:{exit(){}}
 });
 try{
  await until(()=>gpu.connected);assert.equal(app.hmi,hmi);const info=Object.assign({},hmi==='ID8'?id8:id7,{controller:!direct});
  if(direct){sourceError=true;gpu.emit('ready',{},info);await until(()=>statusText.includes('Controller unavailable'));assert(!app.ready&&!gpu.shown);sourceError=false;await app.open('entry');}
  else gpu.emit('ready',{},info);
  await until(()=>app.ready);
  assert(gpu.shown);assert.equal(gpu.grabbed,!direct);assert.equal(gpu.selected,hmi==='ID8'?'layer':'embed');assert(gpu.frames);assert.equal(statusText,'');
  app.session.opts.now=()=>1000;
  const actions=[],original=app.session.input;app.session.input=function(a,n){actions.push(a);return original.call(this,a,n);};
  const send=(knob,press,tilt)=>{if(direct)callback({frontRotaryEncoderOperation:knob,frontRotaryEncoderPushButton:['KEINE_BETAETIGUNG','DREHGEBER_KURZ_GEDRUECKT','DREHGEBER_LANG_GEDRUECKT'][press],frontRotaryEncoderDeflection:{0:'MITTELSTELLUNG',1:'NORD_KURZ_GEDRUECKT',2:'NORD_LANG_GEDRUECKT',4:'OST_KURZ_GEDRUECKT',5:'OST_LANG_GEDRUECKT',7:'SUED_KURZ_GEDRUECKT',8:'SUED_LANG_GEDRUECKT',10:'WEST_KURZ_GEDRUECKT',11:'WEST_LANG_GEDRUECKT'}[tilt]});else gpu.emit('ccu',{knob,press,tilt});};
  send(10,0,0);send(10,0,4);send(10,0,5);send(10,0,0);send(10,0,10);send(10,0,11);send(10,0,0);send(10,0,1);send(10,0,2);send(10,0,0);send(10,0,7);send(10,0,8);send(10,0,0);send(11,0,0);send(10,0,0);send(10,1,0);send(10,2,0);
  assert.deepStrictEqual(actions,['right','left','up','down','rotate','rotate','center']);
  // Both control sources must not act simultaneously.
  if(direct){const n=actions.length;gpu.emit('ccu',{knob:11,press:0,tilt:7});assert.equal(actions.length,n);}
  app.session.openMenu('help');app.session.changed();await until(()=>app.depth===3&&!app.navigating);
  states[1].emit('focus',{focus:true});await until(()=>app.depth===2&&app.session.menu==='pause');
  states[1].emit('focus',{focus:false});await until(()=>!app.session.visible);assert(saved);assert.equal(gpu.shown,hmi==='ID7');
  const n=actions.length;send(12,0,0);assert.equal(actions.length,n);
  states[1].emit('focus',{focus:true});await until(()=>app.session.visible);
  gpu.emit('close');assert(!gpu.shown&&!gpu.grabbed&&!app.session.visible);
  gpu.emit('ready',{},info);await until(()=>app.ready&&app.session.visible);assert.equal(app.session.menu,'pause');
  if(direct){
   gpu.emit('ready',{},Object.assign({},id8,{controller:true}));assert.equal(app.inputVia,'renderer');const before=actions.length;callback({frontRotaryEncoderOperation:20,frontRotaryEncoderPushButton:1,frontRotaryEncoderDeflection:1});assert.equal(actions.length,before);
  }
  // Real menu actions must close the native stack and release input.
  app.session.openMenu();app.session.focus=app.session.labels().indexOf('Exit app');app.session.input('center');await until(()=>closed.some(n=>!n.endsWith('_Menu')&&!n.endsWith('_Detail')));
  assert(!gpu.shown&&!gpu.grabbed&&!app.session.visible);
  await app.shutdown();assert(gpu.closed);if(direct)assert.equal(unsubscribed,1);
  console.log('ok '+id+' '+hmi+' '+(direct?'direct FrontCCU':'renderer controller')+': controls, menus, focus, reconnect, source switching and exit');
 }finally{await app.shutdown();}
}
async function subscriptionRaces(){
 let resolveToken,callback,unsub=0,delivered=0;
 const input=new DirectController(()=>delivered++,{buildTypedProxy:()=>Promise.resolve({init:()=>Promise.resolve(),waitUntilAvailable:()=>Promise.resolve(),statusRotaryEncoderState:{subscribe:cb=>{callback=cb;return new Promise(r=>resolveToken=r);},unsubscribe:t=>{assert.equal(t,23);unsub++;}}})});
 const task=input.start();await until(()=>resolveToken);await input.close();resolveToken(23);await task;callback({});assert.equal(delivered,0);assert.equal(unsub,1);assert(!input.ready);
 console.log('ok controller subscription completing after shutdown is released without delivering input');
}
async function failedSubscription(){
 let attempts=0;
 const input=new DirectController(()=>{}, {buildTypedProxy:()=>{attempts++;return Promise.reject(Error('no service'));}});
 await assert.rejects(input.start(),/no service/);assert(!input.ready);await input.close();assert.equal(attempts,1);
 console.log('ok unavailable direct input does not report readiness');
}
function metadata(){
 for(const id of ['iabadia_2048','iabadia_minesweeper','iabadia_snake','iabadia_tetris']){
  const base=path.join(root,'apps',id),m=require(path.join(base,'mgu-app.json')),tree=path.join(base,m.tree);
  assert.deepStrictEqual(require(path.join(base,'release.json')).mguHmi,['ID7','ID8']);assert.deepStrictEqual(require(path.join(tree,'package.json')).mguHmi,['ID7','ID8']);
  const rhmi=require(path.join(tree,'rhmiData/application.json')).application;
  assert(rhmi.uiDescriptions.some(d=>d.hmi.includes('ID8')));assert(rhmi.variantGroups[0].hmi.includes('ID8'));
  const a=require(path.join(tree,'rhmiData/uiDescriptions/ID7/uiDescription.json')),b=require(path.join(tree,'rhmiData/uiDescriptions/ID8/uiDescription.json'));
  assert.deepStrictEqual(Object.keys(a.containers),Object.keys(b.containers));assert.equal(b.containers['1'].components['10'].name,'gameTitleID8');
  for(const key of Object.keys(a.containers))assert.equal(a.containers[key].name,b.containers[key].name);
  const xml=fs.readFileSync(path.join(tree,'rhmiData/uiDescriptions/ID8/application.xml'),'utf8');assert(xml.includes('LT_State_Wide_List'));assert(!xml.includes('LT_State_A4A_WelcomeApp'));
  const proxies=require(path.join(tree,'manifest.json')).proxies;assert(proxies['de.bmw.infotainment.hmi.remote2.RemoteHmiApplication2']);assert.equal(proxies['de.bmw.infotainment.controlelements.FrontCCU'].attributes.statusRotaryEncoderState,'rs');
 }
 console.log('ok dual-platform resources, state identities, interface declarations and package eligibility');
}
(async()=>{policy();metadata();await subscriptionRaces();await failedSubscription();for(const id of ['iabadia_2048','iabadia_minesweeper','iabadia_snake','iabadia_tetris']){await lifecycle(id,'ID7',false);await lifecycle(id,'ID8',false);await lifecycle(id,'ID8',true);}})().catch(e=>{console.error(e);process.exitCode=1;});
