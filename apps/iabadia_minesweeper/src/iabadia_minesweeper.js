// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const OnlineApp = require('oap-sdk/src/core/OnlineApp.js');
const logger = require('oap-sdk/src/logging/logging').getSDKLogger();
const path = require('path');
const { Session } = require('./session.js');
const storage = require('./storage.js');
const { RenderClient } = require('./mgu_render_client.js');
const kit = require('./kit_record.js');
const { draw, WIDTH, HEIGHT } = require('./draw.js');
const STATE = 'ST_OnlineApps_Minesweeper';
const STATES = [STATE, STATE + '_Menu', STATE + '_Detail'];
const truth = (v) => v === true || v === 1 || v === '1' || v === 'true';

class AppMinesweeper extends OnlineApp {
    constructor() {
        super();
        this.visible = false; this.focused = true; this.ready = false; this.ending = false;
        this.depth = 1; this.navigating = false; this.visibleStates = new Set();
        this.saveFile = path.join(__dirname, '..', '..', 'data', 'Minesweeper.json');
        this.session = new Session(storage.load(this.saveFile), {
            save: (s) => storage.save(this.saveFile, s), change: () => this.render(), exit: () => this.exitApp()
        });
        this.gpu = new RenderClient('iabadia_minesweeper', logger, { kit, mode: 'embed' });
        this.gpu.fps(30);
        this.gpu.on('ready', (screen, info) => {
            this.ready = !!(info && info.controller && info.modes.indexOf('embed') >= 0);
            if (this.ready) {
                const b = info.embedBox, scale = Math.min(b.w / WIDTH, b.h / HEIGHT);
                this.gpu.mode('embed');
                this.gpu.place({ x: b.x, y: b.y, w: b.w, h: b.h, scale,
                    ox: (b.w - WIDTH * scale) / 2, oy: (b.h - HEIGHT * scale) / 2 });
            }
            this.status(this.ready ? '' : 'Minesweeper needs the renderer with controller support. Update Renderer in the Store.');
            this.updateVisibility();
        });
        this.gpu.on('close', () => { this.ready = false; this.updateVisibility(); this.status('Renderer disconnected. ReconnectingÃ¢â‚¬Â¦'); });
        this.gpu.on('ccu', (e) => this.session.ccu(e));
        this.gpu.on('tick', () => { if (this.dirty || this.session.animating()) this.render(); });
        this.gpu.on('closed', () => { this.focused = false; this.updateVisibility(); });
        this.on('initialized', () => this.initialize().catch((e) => logger.error('Minesweeper init: ' + e.message)));
        this.on('shutdown', () => this.shutdown());
        this.on('error', (e) => logger.warn('Minesweeper: ' + e.message));
        this.on('entryPointExecute', (uuid) => this.open(uuid));
        this.on('changeVisibility', (e) => { if (e && e.visible === false) { this.visible = false; this.updateVisibility(); } });
    }
    initialize() {
        if (!this.rhmiApplication) return this.initialized();
        this.state = this.rhmiApplication.getByName(STATE);
        if (!this.state) throw new Error('Minesweeper state missing');
        this.states = STATES.map((name) => this.rhmiApplication.getByName(name));
        if (this.states.some((s) => !s)) throw new Error('Minesweeper menu state missing');
        this.states.forEach((state, index) => {
            state.on('visible', (e) => {
                if (truth(e && e.visible)) {
                    this.visibleStates.add(index); this.visible = true;
                    if (!this.navigating) this.focused = true;
                    this.updateVisibility();
                } else {
                    this.visibleStates.delete(index);
                    clearTimeout(this.hideTimer);
                    this.hideTimer = setTimeout(() => {
                        if (!this.visibleStates.size && !this.navigating) { this.visible = false; this.updateVisibility(); }
                    }, 0);
                }
            });
            state.on('focus', (e) => {
                if (this.navigating) return;
                const focus = truth(e && e.focus);
                if (!focus && index + 1 !== this.depth) return;
                this.focused = focus;
                if (this.focused && index + 1 < this.depth) {
                    this.depth = index + 1;
                    if (index === 0 && this.session.menu === 'pause') { this.session.menu = null; this.session.stamp = this.session.now(); }
                    else this.session.openMenu();
                }
                clearTimeout(this.focusTimer);
                this.focusTimer = setTimeout(() => this.updateVisibility(), 0);
            });
        });
        this.rhmiApplication.on('restoreHmi', () => this.render());
        this.rhmiApplication.on('applicationStackChanged', (stack) => {
            if (stack && Object.keys(stack).length && !Object.prototype.hasOwnProperty.call(stack, 'ROOT_APP')) {
                this.visible = false; this.updateVisibility();
            }
        });
        return Promise.all(this.states.map((s) => s.updateResources())).then(() => {
            const descriptions = this.appDescription.application.entryPoints;
            const ep = this.getEntryPoints().find((p) => descriptions.some((d) => d.uuid === p.getDescription().uuid));
            if (!ep) throw new Error('Minesweeper entry point missing');
            const d = ep.getDescription();
            return ep.init().then(() => this.rhmiApplication.mapEntryState(d.uuid, this.state))
                .then(() => ep.entryPoint.setText(d.textId))
                .then(() => ep.entryPoint.setIcon(d.icon)).then(() => ep.setAvailability('ENABLED'));
        }).then(() => {
            const data = this.getVisibilityData && this.getVisibilityData();
            if (['ENTRY_POINT', 'LUM', 'BOOKMARK', 'START_WIDGET', 'TRIGGER_HMI', 'SPEECH_COMMAND'].indexOf((data && data.reason) || this.startReason) >= 0) this.registerActive();
            return this.initialized();
        }).then(() => {
            this.gpu.connect();
            this.keepalive = setInterval(() => { if (this.visible && this.ready) this.render(); }, 1000);
            const uuid = this.getLastExecutedEntryPointUuid && this.getLastExecutedEntryPointUuid();
            if (uuid) return this.open(uuid);
        });
    }
    status(text) {
        const c = this.rhmiApplication && this.rhmiApplication.getByName('gameStatus');
        if (c) Promise.resolve(c.setValue(0, 'Text', text, 'Text')).catch((e) => logger.warn(e.message));
    }
    open(uuid) {
        if (!this.rhmiApplication || this.ending) return Promise.resolve();
        this.visible = true; this.focused = true; this.updateVisibility();
        return Promise.resolve(this.rhmiApplication.openEntryState(uuid)).catch((e) => logger.warn(e.message));
    }
    updateVisibility() {
        if (this.ending) return;
        const shown = this.visible && this.ready;
        const active = shown && this.focused;
        this.gpu.show(shown);
        this.gpu.grab(active);
        if (active !== this.session.visible) this.session.visibility(active);
        if (this._initialized && this._appStatusService && this.reported !== this.visible) {
            this.reported = this.visible;
            const reports = this.visible ? [this.registerActive(), this.registerHmiVisible()] : [this.unregisterHmiVisible(), this.registerInactive()];
            reports.forEach((p) => Promise.resolve(p).catch((e) => logger.warn(e.message)));
        }
        this.render();
    }
    render() {
        if (!this.gpu || !this.ready || !this.visible || this.ending) return;
        const frame = draw(this.session);
        if (!this.navigating) this.navigationTask = this.syncNavigation();
        this.dirty = !this.gpu.frame(frame);
    }
    async syncNavigation() {
        if (!this.states || this.navigating || !this.visible || this.ending) return;
        this.navigating = true;
        try {
            let target;
            while (this.visible && !this.ending && (target = !this.session.menu ? 1 : ['confirm', 'help', 'difficulty', 'times'].indexOf(this.session.menu) >= 0 ? 3 : 2) !== this.depth) {
                if (this.depth < target) {
                    const name = STATES[this.depth++];
                    try { await this.rhmiApplication.openState(name); }
                    catch (e) { this.depth--; throw e; }
                } else {
                    const name = STATES[--this.depth];
                    try { await this.rhmiApplication.closeState(name); }
                    catch (e) { this.depth++; throw e; }
                }
            }
        } catch (e) { logger.warn('Minesweeper menu navigation: ' + e.message); }
        finally { this.navigating = false; }
    }
    async exitApp() {
        this.visible = false; this.updateVisibility();
        await this.navigationTask;
        this.navigating = true;
        try {
            while (this.depth > 1) await this.rhmiApplication.closeState(STATES[--this.depth]);
            await this.rhmiApplication.closeState(STATE);
        } catch (e) { logger.warn('Minesweeper close: ' + e.message); }
        finally { this.navigating = false; }
    }
    shutdown() {
        if (this.ending) return this.ending;
        this.session.save(); this.gpu.grab(false); this.gpu.show(false); this.gpu.close(); clearInterval(this.keepalive);
        clearTimeout(this.hideTimer); clearTimeout(this.focusTimer);
        this.ending = Promise.resolve().then(() => this.destroyBundles())
            .catch((e) => logger.warn(e.message)).then(() => process.exit(0));
        return this.ending;
    }
}
const app = new AppMinesweeper();
app.start().catch((e) => logger.error('Minesweeper start: ' + e.message));
