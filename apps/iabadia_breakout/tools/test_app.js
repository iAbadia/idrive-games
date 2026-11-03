// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const net = require('net');
const EventEmitter = require('events');
const ROOT = path.join(__dirname, '..');
const log = { info() {}, warn() {}, error(message) { throw new Error(message); } };
const later = () => new Promise((r) => setImmediate(r));
async function until(fn) { for (let i = 0; i < 100; i++) { if (fn()) return; await new Promise((r) => setTimeout(r, 10)); } throw new Error('Timed out'); }

async function lifecycle() {
 let app,gpu,saved;const states=[new EventEmitter(),new EventEmitter(),new EventEmitter()];states.forEach(s=>s.updateResources=()=>Promise.resolve());
 const rhmi=new EventEmitter(),status={setValue(){return Promise.resolve();}},opened=[],closed=[];
 rhmi.getByName=n=>n==='gameStatus'?status:states[n.endsWith('_Detail')?2:n.endsWith('_Menu')?1:0];
 rhmi.mapEntryState=()=>Promise.resolve();rhmi.openEntryState=()=>Promise.resolve();
 rhmi.openState=n=>{opened.push(n);return Promise.resolve();};rhmi.closeState=n=>{closed.push(n);return Promise.resolve();};
 const d={uuid:'entry',textId:'SID_Breakout_TITLE',icon:'icon.png'};
 const ep={getDescription:()=>d,init:()=>Promise.resolve(),setAvailability:()=>Promise.resolve(),entryPoint:{setText:()=>Promise.resolve(),setIcon:()=>Promise.resolve()}};
 class SDK extends EventEmitter {
  constructor(){super();app=this;this.rhmiApplication=rhmi;this.appDescription={application:{entryPoints:[d]}};this.startReason='ENTRY_POINT';this._appStatusService={};}
  start(){this.emit('initialized');return Promise.resolve();} initialized(){this._initialized=true;return Promise.resolve();}
  getEntryPoints(){return[ep];}getLastExecutedEntryPointUuid(){return'entry';}
  registerActive(){this.active=true;return Promise.resolve();}registerInactive(){this.active=false;return Promise.resolve();}
  registerHmiVisible(){return Promise.resolve();}unregisterHmiVisible(){return Promise.resolve();}destroyBundles(){return Promise.resolve();}
 }
 class GPU extends EventEmitter{constructor(){super();gpu=this;}fps(){}connect(){this.connected=true;}mode(){}place(p){this.placement=p;}show(v){this.shown=v;}grab(v){this.grabbed=v;}frame(r){this.words=r.words().length;return true;}close(){this.closed=true;}}
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'src/iabadia_breakout.js'),'utf8'),{
  __dirname:path.join(ROOT,require('../mgu-app.json').tree,'javascript'),
  require(n){if(n.includes('OnlineApp'))return SDK;if(n.includes('logging'))return{getSDKLogger:()=>log};if(n==='./storage.js')return{load:()=>null,save:(f,s)=>{saved=s;}};if(n==='./mgu_render_client.js')return{RenderClient:GPU};return n.startsWith('./')?require(path.join(ROOT,'src',n)):require(n);},setInterval,clearInterval,setTimeout,clearTimeout,process:{exit(){}}
 });
 await until(()=>gpu.connected);gpu.emit('ready',{}, {controller:true,modes:['embed'],embedBox:{x:100,y:100,w:1280,h:480}});
 assert(gpu.grabbed&&gpu.shown&&gpu.words);gpu.emit('ccu',{knob:0,press:0,tilt:0});gpu.emit('ccu',{knob:1,press:0,tilt:0});assert.notStrictEqual(app.session.game.status,'ready');
 app.session.input('back');await until(()=>app.depth===2&&!app.navigating);assert(opened.includes('ST_OnlineApps_Breakout_Menu'));
 app.session.input('rotate',2);app.session.input('center');await until(()=>app.depth===3&&!app.navigating);assert.strictEqual(app.session.menu,'difficulty');
 states[1].emit('focus',{focus:true});await later();assert.strictEqual(app.session.menu,'pause');assert.strictEqual(app.depth,2);
 states[1].emit('focus',{focus:false});await until(()=>!gpu.grabbed);assert(saved);states[1].emit('focus',{focus:true});await until(()=>gpu.grabbed);
 states[0].emit('focus',{focus:true});await later();assert.strictEqual(app.session.menu,null);
 app.session.input('back');await later();app.session.input('rotate',5);app.session.input('center');await later();assert(!gpu.grabbed&&!gpu.shown);assert(closed.includes('ST_OnlineApps_Breakout'));
 app.emit('shutdown');await later();assert(gpu.closed);console.log('ok Breakout OAP launch, game input, menus, Back, focus, persistence and exit');
}

function message(type, payload) {
    const b = Buffer.alloc(8 + payload.length); b.writeUInt32LE(type); b.writeUInt32LE(payload.length, 4); payload.copy(b, 8); return b;
}
async function wire() {
    const { RenderClient } = require('../src/mgu_render_client.js');
    const socket = process.platform === 'win32' ? '\\\\.\\pipe\\mgu-breakout-test-' + process.pid : path.join(require('os').tmpdir(), 'mgu-breakout-' + process.pid + '.sock');
    const peers = new Set(); let peer, input = Buffer.alloc(0); const received = [];
    const server = net.createServer((s) => {
        peers.add(s); peer = s;
        s.on('data', (d) => {
            input = Buffer.concat([input, d]);
            while (input.length >= 8 && input.length >= input.readUInt32LE(4) + 8) {
                const type = input.readUInt32LE(0), len = input.readUInt32LE(4), p = input.slice(8, 8 + len);
                received.push({ type, p: Buffer.from(p) }); input = input.slice(8 + len);
                if (type === 1) {
                    const x = Buffer.alloc(52); [1, 2, 2, 100, 100, 1280, 480, 0, 0, 1920, 720, 1024, 60000].forEach((v, i) => x.writeUInt32LE(v, i * 4));
                    const r = Buffer.alloc(12); r.writeUInt32LE(1920, 4); r.writeUInt32LE(720, 8);
                    // Real stream framing: a split header, then coalesced messages.
                    const all = Buffer.concat([message(0x4d520101, x), message(101, r)]);
                    s.write(all.slice(0, 3)); s.write(all.slice(3));
                }
            }
        });
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(socket, resolve); });
    const gpu = new RenderClient('iabadia_breakout', log, { socket, kit: require('../src/kit_record.js'), mode: 'embed' });
    const { Session } = require('../src/session.js'), { draw } = require('../src/draw.js');
    const s = new Session(null); s.visibility(true); gpu.on('ccu', (e) => s.ccu(e));
    try {
        gpu.connect(); await until(() => gpu.ready); assert(gpu.info.controller);
        gpu.place({ x: 100, y: 100, w: 1280, h: 480, scale: 1, ox: 0, oy: 0 }); gpu.show(true); gpu.grab(true); gpu.frame(draw(s));
        await until(() => received.some((m) => m.type === 7));
        assert(received.some((m) => m.type === 4)); // Font atlases uploaded before drawing.
        function ccu(press, tilt, knob) { const b = Buffer.alloc(5); b.writeUInt16BE(knob === undefined ? 100 : knob, 1); b[3] = press; b[4] = tilt; peer.write(message(0x4d520103, b)); }
        ccu(0, 0, 65535); ccu(0, 0, 0); ccu(0, 0, 1); await until(() => s.game.status !== 'ready');
        gpu.grab(false); gpu.show(false);
        await until(() => received.some((m) => m.type === 0x4d520002 && m.p.readUInt32LE(0) === 0));
        console.log('ok renderer stream handshake, placement, fonts, frames, controller input and release');
    } finally {
        gpu.close(); peers.forEach((p) => p.destroy()); await new Promise((r) => server.close(r));
    }
}
(async () => { await lifecycle(); await wire(); })().catch((e) => { console.error(e); process.exitCode = 1; });
