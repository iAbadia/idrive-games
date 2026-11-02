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
    let app, gpu, saved, processExit;
    const states = [new EventEmitter(), new EventEmitter(), new EventEmitter()];
    states.forEach((s) => { s.updateResources = () => Promise.resolve(); });
    const state = states[0];
    const status = { setValue(row, field, text) { this.text = text; return Promise.resolve(); } };
    const rhmi = new EventEmitter();
    rhmi.getByName = (n) => n === 'gameStatus' ? status : states[n.endsWith('_Detail') ? 2 : n.endsWith('_Menu') ? 1 : 0];
    const opened = [], closed = [];
    rhmi.openState = (name) => { opened.push(name); return Promise.resolve(); };
    rhmi.mapEntryState = () => Promise.resolve(); rhmi.openEntryState = () => Promise.resolve();
    rhmi.closeState = (name) => { closed.push(name); rhmi.closed = true; return Promise.resolve(); };
    const d = { uuid: 'entry', textId: 'SID_2048_TITLE', icon: 'icon.png' };
    const ep = { getDescription: () => d, init: () => Promise.resolve(), setAvailability: () => Promise.resolve(),
        entryPoint: { setText: () => Promise.resolve(), setIcon: () => Promise.resolve() } };
    class SDK extends EventEmitter {
        constructor() { super(); app = this; this.rhmiApplication = rhmi; this.appDescription = { application: { entryPoints: [d] } }; this.startReason = 'ENTRY_POINT'; this._appStatusService = {}; }
        start() { this.emit('initialized'); return Promise.resolve(); }
        initialized() { this._initialized = true; return Promise.resolve(); }
        getEntryPoints() { return [ep]; }
        getLastExecutedEntryPointUuid() { return 'entry'; }
        registerActive() { this.active = true; return Promise.resolve(); }
        registerInactive() { this.active = false; return Promise.resolve(); }
        registerHmiVisible() { return Promise.resolve(); }
        unregisterHmiVisible() { return Promise.resolve(); }
        destroyBundles() { this.destroyed = true; return Promise.resolve(); }
    }
    class GPU extends EventEmitter {
        constructor() { super(); gpu = this; }
        fps() {} connect() { this.connected = true; } mode() {} place(p) { this.placement = p; }
        show(on) { this.shown = on; } grab(on) { this.grabbed = on; }
        frame(r) { this.frames = (this.frames || 0) + 1; this.words = r.words().length; return true; } close() { this.closed = true; }
    }
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/iabadia_2048.js'), 'utf8'), {
        __dirname: path.join(ROOT, 'iabadia_2048@0.1.2/javascript'),
        require(name) {
            if (name.indexOf('OnlineApp') >= 0) return SDK;
            if (name.indexOf('logging') >= 0) return { getSDKLogger: () => log };
            if (name === './storage.js') return { load: () => null, save: (f, v) => { saved = v; } };
            if (name === './mgu_render_client.js') return { RenderClient: GPU };
            return name.startsWith('./') ? require(path.join(ROOT, 'src', name)) : require(name);
        }, setInterval, clearInterval, setTimeout, clearTimeout, process: { exit: (v) => { processExit = v; } }, console
    });
    await until(() => gpu.connected);
    assert(app.active); assert(!gpu.grabbed);
    const ready = { controller: true, modes: ['embed'], embedBox: { x: 100, y: 100, w: 1280, h: 480 } };
    gpu.emit('ready', {}, ready); assert(gpu.shown && gpu.grabbed); assert(gpu.words > 0);
    assert.strictEqual(gpu.placement.scale, 1);
    let time = 1000; app.session.opts.now = () => time;
    app.session.game.board = [2].concat(Array(15).fill(0)); app.session.input('right');
    const frames = gpu.frames; time = 1060; gpu.emit('tick'); assert(gpu.frames > frames);
    time = 1260; gpu.emit('tick'); assert(!app.session.animating());
    const settled = gpu.frames; gpu.emit('tick'); assert.strictEqual(gpu.frames, settled);
    gpu.emit('ccu', { knob: 0, press: 0, tilt: 0 });
    gpu.emit('ccu', { knob: 0, press: 1, tilt: 0 }); assert.strictEqual(app.session.menu, 'pause');
    await later();
    states[1].emit('focus', { focus: false }); await until(() => !gpu.grabbed); assert(!app.session.visible); assert(saved);
    states[1].emit('focus', { focus: true }); await until(() => gpu.grabbed); assert.strictEqual(app.session.menu, 'pause');
    state.emit('visible', { visible: '0' }); await until(() => !gpu.shown); assert(!app.active);
    await app.open('entry'); assert(gpu.grabbed);
    gpu.emit('close'); assert(!gpu.shown && !gpu.grabbed); assert(!app.session.visible);
    gpu.emit('ready', {}, Object.assign({}, ready, { controller: false })); assert(!gpu.grabbed); assert(status.text.includes('Update Renderer'));
    gpu.emit('ready', {}, ready); assert(gpu.grabbed); assert.strictEqual(app.session.menu, 'pause');
    await later();
    app.session.input('rotate', 3); app.session.input('center'); await until(() => app.depth === 3 && !app.navigating);
    assert.strictEqual(app.session.menu, 'help'); assert(opened.includes('ST_OnlineApps_2048_Detail'));
    states[1].emit('focus', { focus: true }); await later();
    assert.strictEqual(app.session.menu, 'pause'); assert.strictEqual(app.depth, 2);
    app.session.input('rotate', 1); app.session.input('center'); await until(() => app.depth === 3 && !app.navigating);
    const beforeBack = app.session.game.snapshot();
    states[1].emit('focus', { focus: true }); await later();
    assert.strictEqual(app.session.menu, 'pause'); assert.strictEqual(app.depth, 2);
    assert.deepStrictEqual(app.session.game.snapshot(), beforeBack);
    state.emit('focus', { focus: true }); await later();
    assert.strictEqual(app.session.menu, null); assert.strictEqual(app.depth, 1);
    app.session.game.score = 128; app.session.game.best = 128;
    app.session.enterInitials('scores'); app.session.changed(); await until(() => app.depth === 3 && !app.navigating);
    assert.strictEqual(app.session.menu, 'initials');
    states[1].emit('focus', { focus: true }); await later();
    assert.strictEqual(app.session.menu, 'scores'); assert.strictEqual(app.session.arcade.draft, null);
    await until(() => app.depth === 3 && !app.navigating);
    app.session.input('back'); await until(() => app.depth === 2 && !app.navigating);
    app.session.input('back'); await until(() => app.depth === 1 && !app.navigating);
    app.session.input('center'); await later();
    app.session.input('rotate', 4); app.session.input('center'); await later();
    assert(rhmi.closed); assert(!gpu.shown && !gpu.grabbed); assert(!app.active);
    app.emit('shutdown'); await until(() => processExit === 0); assert(gpu.closed && app.destroyed);
    console.log('ok OAP launch, controller gate, focus, reconnect, exit and shutdown');
}

function message(type, payload) {
    const b = Buffer.alloc(8 + payload.length); b.writeUInt32LE(type); b.writeUInt32LE(payload.length, 4); payload.copy(b, 8); return b;
}
async function wire() {
    const { RenderClient } = require('../src/mgu_render_client.js');
    const socket = process.platform === 'win32' ? '\\\\.\\pipe\\mgu-2048-test-' + process.pid : path.join(require('os').tmpdir(), 'mgu-2048-' + process.pid + '.sock');
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
    const gpu = new RenderClient('iabadia_2048', log, { socket, kit: require('../src/kit_record.js'), mode: 'embed' });
    const { Session } = require('../src/session.js'), { draw } = require('../src/draw.js');
    const s = new Session(null); s.visibility(true); gpu.on('ccu', (e) => s.ccu(e));
    try {
        gpu.connect(); await until(() => gpu.ready); assert(gpu.info.controller);
        gpu.place({ x: 100, y: 100, w: 1280, h: 480, scale: 1, ox: 0, oy: 0 }); gpu.show(true); gpu.grab(true); gpu.frame(draw(s));
        await until(() => received.some((m) => m.type === 7));
        assert(received.some((m) => m.type === 4)); // Font atlases uploaded before drawing.
        function ccu(press, tilt) { const b = Buffer.alloc(5); b.writeUInt16BE(100, 1); b[3] = press; b[4] = tilt; peer.write(message(0x4d520103, b)); }
        ccu(0, 0); ccu(1, 0); await until(() => s.menu === 'pause');
        gpu.grab(false); gpu.show(false);
        await until(() => received.some((m) => m.type === 0x4d520002 && m.p.readUInt32LE(0) === 0));
        console.log('ok renderer stream handshake, placement, fonts, frames, controller input and release');
    } finally {
        gpu.close(); peers.forEach((p) => p.destroy()); await new Promise((r) => server.close(r));
    }
}
(async () => { await lifecycle(); await wire(); })().catch((e) => { console.error(e); process.exitCode = 1; });
