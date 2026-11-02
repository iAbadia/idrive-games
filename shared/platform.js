// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Shared ID7/ID8 host negotiation and direct FrontCCU fallback.
function host(info,hmi,w,h){
 if(!info||!Array.isArray(info.modes))return null;
 const modes=hmi==='ID8'?['layer']:['embed','layer'];
 for(const mode of modes){
  if(!info.modes.includes(mode))continue;
  const b=mode==='embed'?info.embedBox:info.appArea;
  if(!b||![b.x,b.y,b.w,b.h].every(Number.isFinite)||b.w<=0||b.h<=0)continue;
  const scale=Math.min(b.w/w,b.h/h);
  return{mode,placement:{x:b.x,y:b.y,w:b.w,h:b.h,scale,ox:(b.w-w*scale)/2,oy:(b.h-h*scale)/2}};
 }return null;
}
const DEFL={MITTELSTELLUNG:0,NORD_KURZ_GEDRUECKT:1,NORD_LANG_GEDRUECKT:2,NORD_UNWIRKSAM:3,OST_KURZ_GEDRUECKT:4,OST_LANG_GEDRUECKT:5,OST_UNWIRKSAM:6,SUED_KURZ_GEDRUECKT:7,SUED_LANG_GEDRUECKT:8,SUED_UNWIRKSAM:9,WEST_KURZ_GEDRUECKT:10,WEST_LANG_GEDRUECKT:11,WEST_UNWIRKSAM:12,SIGNAL_UNGUELTIG:15};
const PUSH={KEINE_BETAETIGUNG:0,DREHGEBER_KURZ_GEDRUECKT:1,DREHGEBER_LANG_GEDRUECKT:2,UNWIRKSAM:3,SIGNAL_UNGUELTIG:15};
function ordinal(v,names){return Number.isInteger(v)&&v>=0&&v<=15?v:Object.prototype.hasOwnProperty.call(names,v)?names[v]:15;}
function sample(v){v=v||{};return{knob:Number.isInteger(v.frontRotaryEncoderOperation)&&v.frontRotaryEncoderOperation>=0&&v.frontRotaryEncoderOperation<=65535?v.frontRotaryEncoderOperation:65535,press:ordinal(v.frontRotaryEncoderPushButton,PUSH),tilt:ordinal(v.frontRotaryEncoderDeflection,DEFL)};}
class DirectController{
 constructor(deliver,builders){this.deliver=deliver;this.builders=builders;this.closed=false;this.ready=false;this.token=null;this.attribute=null;}
 start(){
  if(this.task)return this.task;
  this.task=Promise.resolve().then(()=>{
   const b=this.builders||require('oap-sdk/src/someip/someipBuilders');
   return b.buildTypedProxy('de.bmw.infotainment.controlelements.FrontCCU','1');
  }).then(p=>{this.proxy=p;return p.init();}).then(()=>this.proxy.waitUntilAvailable()).then(()=>{
   if(this.closed)return;
   this.attribute=this.proxy.statusRotaryEncoderState;
   return Promise.resolve(this.attribute.subscribe(v=>{if(!this.closed)this.deliver(sample(v));})).then(token=>{
    this.token=token;this.ready=!this.closed;if(this.closed)return this.unsubscribe();
   });
  });return this.task;
 }
 unsubscribe(){const a=this.attribute,t=this.token;this.token=null;if(a&&t!==null&&t!==undefined&&typeof a.unsubscribe==='function')return Promise.resolve(a.unsubscribe(t)).catch(()=>undefined);return Promise.resolve();}
 close(){this.closed=true;this.ready=false;return this.unsubscribe();}
}
module.exports={host,sample,DirectController};
