// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const net = require('net');
const EventEmitter = require('events');
const ROOT = path.join(__dirname, '..');
const log = {
    info() {},
    warn() {},
    error(message) {
        throw new Error(message);
    },
};
const later = () => new Promise((r) => setImmediate(r));
async function until(fn) {
    for (let i = 0; i < 100; i++) {
        if (fn()) return;
        await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error('Timed out');
}

async function lifecycle() {
    let app, gpu;
    const states = Array.from({ length: 4 }, () => new EventEmitter());
    states.forEach((s) => (s.updateResources = () => Promise.resolve()));
    const rhmi = new EventEmitter(),
        status = {
            setValue() {
                return Promise.resolve();
            },
        },
        opened = [],
        closed = [];
    const names = [
        'ST_OnlineApps_MArcade',
        'ST_OnlineApps_MArcade_Game',
        'ST_OnlineApps_MArcade_Menu',
        'ST_OnlineApps_MArcade_Detail',
    ];
    rhmi.getByName = (n) =>
        n === 'gameStatus' ? status : states[names.indexOf(n)];
    rhmi.mapEntryState = () => Promise.resolve();
    rhmi.openEntryState = () => Promise.resolve();
    rhmi.openState = (n) => {
        opened.push(n);
        return Promise.resolve();
    };
    rhmi.closeState = (n) => {
        closed.push(n);
        return Promise.resolve();
    };
    const d = {
        uuid: 'entry',
        textId: 'SID_MArcade_TITLE',
        icon: 'iabadia_m_arcade_icon.png',
    };
    const ep = {
        getDescription: () => d,
        init: () => Promise.resolve(),
        setAvailability: () => Promise.resolve(),
        entryPoint: {
            setText: () => Promise.resolve(),
            setIcon: () => Promise.resolve(),
        },
    };
    class SDK extends EventEmitter {
        constructor() {
            super();
            app = this;
            this.rhmiApplication = rhmi;
            this.appDescription = { application: { entryPoints: [d] } };
            this.startReason = 'ENTRY_POINT';
            this._appStatusService = {};
        }
        start() {
            this.emit('initialized');
            return Promise.resolve();
        }
        initialized() {
            this._initialized = true;
            return Promise.resolve();
        }
        getEntryPoints() {
            return [ep];
        }
        getLastExecutedEntryPointUuid() {
            return 'entry';
        }
        registerActive() {
            this.active = true;
            return Promise.resolve();
        }
        registerInactive() {
            this.active = false;
            return Promise.resolve();
        }
        registerHmiVisible() {
            return Promise.resolve();
        }
        unregisterHmiVisible() {
            return Promise.resolve();
        }
        destroyBundles() {
            return Promise.resolve();
        }
    }
    class GPU extends EventEmitter {
        constructor() {
            super();
            gpu = this;
        }
        fps() {}
        connect() {
            this.connected = true;
        }
        mode() {}
        place(p) {
            this.placement = p;
        }
        show(v) {
            this.shown = v;
        }
        grab(v) {
            this.grabbed = v;
        }
        frame(r) {
            this.words = r.words().length;
            return true;
        }
        close() {
            this.closed = true;
        }
    }
    const { Saves } = require('../src/core/saves.js'),
        tmp = fs.mkdtempSync(
            path.join(require('os').tmpdir(), 'm-arcade-native-'),
        );
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/app.js'), 'utf8'), {
        __dirname: path.join(
            ROOT,
            require('../mgu-app.json').tree,
            'javascript',
        ),
        require(n) {
            if (n.includes('OnlineApp')) return SDK;
            if (n.includes('logging')) return { getSDKLogger: () => log };
            if (n === './core/saves.js')
                return {
                    Saves: class extends Saves {
                        constructor() {
                            super(tmp);
                        }
                    },
                };
            if (n === './kit/mgu_render_client.js')
                return { RenderClient: GPU };
            return n.startsWith('./')
                ? require(path.join(ROOT, 'src', n))
                : require(n);
        },
        setInterval,
        clearInterval,
        setTimeout,
        clearTimeout,
        process: { exit() {} },
    });
    try {
        await until(() => gpu.connected);
        gpu.emit(
            'ready',
            {},
            {
                controller: true,
                modes: ['embed'],
                embedBox: { x: 100, y: 100, w: 1280, h: 480 },
            },
        );
        assert(gpu.grabbed && gpu.shown && gpu.words);
        assert.equal(app.session.route, 'library');
        assert.equal(app.depth, 1);
        app.session.activate('breakout');
        await until(() => app.depth === 2 && !app.navigating);
        assert(opened.includes(names[1]));
        app.session.input('rotate', 1);
        gpu.emit('tick');
        assert.equal(app.session.game.status, 'playing');
        app.session.input('center');
        await until(() => app.depth === 3 && !app.navigating);
        assert(opened.includes(names[2]));
        app.session.focus = 4;
        app.session.input('center');
        await until(() => app.depth === 4 && !app.navigating);
        assert.equal(app.session.menu, 'help');
        states[2].emit('focus', { focus: true });
        await until(() => app.depth === 3 && !app.navigating);
        assert.equal(app.session.menu, 'pause');
        states[1].emit('focus', { focus: true });
        await until(() => app.depth === 2 && !app.navigating);
        assert.equal(app.session.menu, null);
        states[1].emit('focus', { focus: false });
        await until(() => !gpu.grabbed);
        assert.equal(app.session.menu, 'pause');
        states[1].emit('focus', { focus: true });
        await until(() => gpu.grabbed);
        assert.equal(app.session.menu, 'pause');
        // Renderer loss must release input and pause; reconnect uploads through one client.
        gpu.emit('close');
        assert(!gpu.grabbed);
        gpu.emit(
            'ready',
            {},
            {
                controller: true,
                modes: ['embed'],
                embedBox: { x: 0, y: 0, w: 1280, h: 480 },
            },
        );
        assert.equal(app.session.menu, 'pause');
        // Native Back from Game pops to Library without reopening the game state.
        states[0].emit('focus', { focus: true });
        await until(() => app.depth === 1 && !app.navigating);
        assert.equal(app.session.route, 'library');
        assert.equal(app.session.runtime, null);
        app.session.input('back');
        await later();
        assert(!gpu.grabbed && !gpu.shown);
        assert(closed.includes(names[0]));
        await app.open('entry');
        assert.equal(app.session.route, 'library');
        console.log(
            'ok M Arcade native Library/Game/Menu/Detail Back, focus, reconnect, exit and reopen',
        );
    } finally {
        app.emit('shutdown');
        await later();
        assert(gpu.closed);
    }
}
function message(type, payload) {
    const b = Buffer.alloc(8 + payload.length);
    b.writeUInt32LE(type);
    b.writeUInt32LE(payload.length, 4);
    payload.copy(b, 8);
    return b;
}
async function wire() {
    const { RenderClient } = require('../src/kit/mgu_render_client.js');
    const socket =
        process.platform === 'win32'
            ? '\\\\.\\pipe\\mgu-arcade-test-' + process.pid
            : path.join(
                  require('os').tmpdir(),
                  'mgu-arcade-' + process.pid + '.sock',
              );
    const peers = new Set();
    let peer,
        input = Buffer.alloc(0);
    const received = [];
    const server = net.createServer((s) => {
        peers.add(s);
        peer = s;
        s.on('data', (d) => {
            input = Buffer.concat([input, d]);
            while (
                input.length >= 8 &&
                input.length >= input.readUInt32LE(4) + 8
            ) {
                const type = input.readUInt32LE(0),
                    len = input.readUInt32LE(4),
                    p = input.slice(8, 8 + len);
                received.push({ type, p: Buffer.from(p) });
                input = input.slice(8 + len);
                if (type === 1) {
                    const x = Buffer.alloc(52);
                    [
                        1, 2, 2, 100, 100, 1280, 480, 0, 0, 1920, 720, 1024,
                        60000,
                    ].forEach((v, i) => x.writeUInt32LE(v, i * 4));
                    const r = Buffer.alloc(12);
                    r.writeUInt32LE(1920, 4);
                    r.writeUInt32LE(720, 8);
                    // Real stream framing: a split header, then coalesced messages.
                    const all = Buffer.concat([
                        message(0x4d520101, x),
                        message(101, r),
                    ]);
                    s.write(all.slice(0, 3));
                    s.write(all.slice(3));
                }
            }
        });
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(socket, resolve);
    });
    const gpu = new RenderClient('iabadia_m_arcade', log, {
        socket,
        kit: require('../src/kit/kit_record.js'),
        mode: 'embed',
    });
    const { Session } = require('../src/core/session.js'),
        { draw } = require('../src/ui/draw.js'),
        { icons } = require('./preview.js');
    const { Saves } = require('../src/core/saves.js');
    const s = new Session({
        store: new Saves(
            fs.mkdtempSync(path.join(require('os').tmpdir(), 'm-arcade-wire-')),
        ),
    });
    s.visibility(true);
    gpu.on('ccu', (e) => s.ccu(e));
    try {
        gpu.connect();
        await until(() => gpu.ready);
        assert(gpu.info.controller);
        gpu.place({ x: 100, y: 100, w: 1280, h: 480, scale: 1, ox: 0, oy: 0 });
        gpu.show(true);
        gpu.grab(true);
        gpu.frame(draw(s, icons));
        await until(() => received.some((m) => m.type === 7));
        assert(received.some((m) => m.type === 4)); // Font atlases uploaded before drawing.
        function ccu(press, tilt, knob) {
            const b = Buffer.alloc(5);
            b.writeUInt16BE(knob === undefined ? 100 : knob, 1);
            b[3] = press;
            b[4] = tilt;
            peer.write(message(0x4d520103, b));
        }
        ccu(0, 0, 65535);
        ccu(0, 0, 0);
        ccu(1, 0, 0);
        await until(() => s.runtime !== null);
        assert.equal(s.definition.id, '2048');
        assert(gpu.sent.image.size >= 5);
        gpu.grab(false);
        gpu.show(false);
        await until(() =>
            received.some(
                (m) => m.type === 0x4d520002 && m.p.readUInt32LE(0) === 0,
            ),
        );
        console.log(
            'ok renderer stream handshake, placement, fonts, frames, controller input and release',
        );
    } finally {
        gpu.close();
        peers.forEach((p) => p.destroy());
        await new Promise((r) => server.close(r));
    }
}
function linked() {
    const link = require('../../../tools/oap_link.js'),
        temp = fs.mkdtempSync(
            path.join(require('os').tmpdir(), 'm-arcade-link-'),
        );
    // Purpose-built test double, no BMW SDK implementation or credentials.
    const prelude =
        '(function(){function r(m,c,e){function load(id){if(c[id])return c[id].exports;if(!m[id])return require(id);const mod=c[id]={exports:{}};m[id][0](function(n){return load(m[id][1][n]||n)},mod,mod.exports);return mod.exports;}e.forEach(load);return load;}return r})()';
    const donor =
        prelude +
        '({1:[function(require,module,exports){},{"oap-sdk/src/core/OnlineApp.js":2,"oap-sdk/src/logging/logging":3}],2:[function(require,module,exports){const E=require("events");module.exports=class extends E.EventEmitter{constructor(){super();global.app=this;}start(){return Promise.resolve();}};},{}],3:[function(require,module,exports){module.exports={getSDKLogger:()=>({warn(){},error(){},info(){}})};},{}]},{},[]);';
    const file = path.join(temp, 'donor.js'),
        out = path.join(temp, 'arcade.tgz');
    fs.writeFileSync(file, donor);
    require('./build.js').generate();
    link.build(ROOT, out, { donors: [file], epoch: 1700000000 });
    const members = link.untar(fs.readFileSync(out)),
        bundle = members.find((v) => v.name === 'javascript/app.js');
    assert(bundle);
    const global = {};
    vm.runInNewContext(
        bundle.data.toString('utf8'),
        {
            require,
            global,
            process,
            Buffer,
            Uint8Array,
            Uint32Array,
            Float32Array,
            ArrayBuffer,
            __dirname: path.join(
                ROOT,
                require('../mgu-app.json').tree,
                'javascript',
            ),
            setTimeout,
            clearTimeout,
            setInterval,
            clearInterval,
        },
        { timeout: 5000 },
    );
    assert(global.app);
    assert.equal(global.app.session.route, 'library');
    assert.equal(Object.keys(global.app.icons).length, 6);
    global.app.gpu.close();
    assert(!members.some((v) => /preview|tools|package-src/.test(v.name)));
    console.log(
        'ok on-unit source linker resolves all namespaced modules and starts the linked app',
    );
}
(async () => {
    await lifecycle();
    await wire();
    linked();
})().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
