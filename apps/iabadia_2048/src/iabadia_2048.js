// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const OnlineApp = require('oap-sdk/src/core/OnlineApp.js');
const logger = require('oap-sdk/src/logging/logging').getSDKLogger();
const path = require('path');
const { Session } = require('./session.js');
const storage = require('./storage.js');
const { RenderClient } = require('./mgu_render_client.js');
const kit = require('./kit_record.js');
const { host, DirectController } = require('./platform.js');
const { draw, WIDTH, HEIGHT } = require('./draw.js');
const STATE = 'ST_OnlineApps_2048';
const STATES = [STATE, STATE + '_Menu', STATE + '_Detail'];
const truth = (v) => v === true || v === 1 || v === '1' || v === 'true';

class App2048 extends OnlineApp {
    constructor() {
        super();
        this.visible = false; this.focused = true; this.ready = false; this.ending = false;
        this.depth = 1; this.navigating = false; this.visibleStates = new Set();
        this.saveFile = path.join(__dirname, '..', '..', 'data', '2048.json');
        this.session = new Session(storage.load(this.saveFile), {
            save: (s) => storage.save(this.saveFile, s), change: () => this.render(), exit: () => this.exitApp()
        });
        this.gpu = new RenderClient('iabadia_2048', logger, { kit, mode: 'layer' });
        this.gpu.fps(30);
        this.gpu.on('ready', (screen, info) => this.configureRenderer(info));
        this.gpu.on('close', () => { this.rendererInfo = null; this.ready = false; this.updateVisibility(); this.status('Renderer disconnected. Reconnecting...'); });
        this.gpu.on('ccu', (e) => { if (this.inputVia === 'renderer') this.session.ccu(e); });
        this.gpu.on('tick', () => { if (this.dirty || this.session.animating()) this.render(); });
        this.gpu.on('closed', () => { this.focused = false; this.updateVisibility(); });
        this.on('initialized', () => this.initialize().catch((e) => logger.error('2048 init: ' + e.message)));
        this.on('shutdown', () => this.shutdown());
        this.on('error', (e) => logger.warn('2048: ' + e.message));
        this.on('entryPointExecute', (uuid) => this.open(uuid));
        this.on('changeVisibility', (e) => { if (e && e.visible === false) { this.visible = false; this.updateVisibility(); } });
    }
    configureRenderer(info) {
        this.rendererInfo = info;
        const selected = host(info, this.hmi || 'ID7', WIDTH, HEIGHT);
        this.ready = false;
        if (!selected) { this.status('No compatible renderer display mode. Update Renderer in the Store.'); this.updateVisibility(); return; }
        this.renderMode = selected.mode;
        this.gpu.mode(selected.mode); this.gpu.place(selected.placement);
        const via = info.controller ? 'renderer' : this.hmi === 'ID8' ? 'direct' : null;
        if (this.inputVia !== via) this.session.last = null;
        this.inputVia = via;
        if (via === 'renderer') { this.ready = true; this.status(''); }
        else if (via === 'direct') {
            if (!this.directInput) this.directInput = new DirectController(e => {
                if (this.inputVia === 'direct' && this.ready) this.session.ccu(e);
            });
            if (this.directInput.ready) { this.ready = true; this.status(''); }
            else {
                this.status('Connecting to iDrive controller...');
                const pendingInput = this.directInput;
                pendingInput.start().then(() => {
                    if (this.ending || this.rendererInfo !== info || this.inputVia !== 'direct' || !pendingInput.ready) return;
                    this.ready = true; this.status(''); this.updateVisibility();
                }).catch(e => {
                    if (!this.ending && this.rendererInfo === info) { this.ready = false; this.status('Controller unavailable. Reopen the app to retry.'); this.updateVisibility(); }
                    if (this.directInput === pendingInput) { pendingInput.close(); this.directInput = null; }
                    logger.warn('Controller: ' + e.message);
                });
            }
        } else this.status('This game needs controller support. Update Renderer in the Store.');
        this.updateVisibility();
    }
    initialize() {
        if (!this.rhmiApplication) return this.initialized();
        this.hmi = this.rhmiApplication.getByName('gameTitleID8') ? 'ID8' : 'ID7';
        this.state = this.rhmiApplication.getByName(STATE);
        if (!this.state) throw new Error('2048 state missing');
        this.states = STATES.map((name) => this.rhmiApplication.getByName(name));
        if (this.states.some((s) => !s)) throw new Error('2048 menu state missing');
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
                    if (index === 0 && this.session.menu === 'pause') this.session.menu = null;
                    else if (this.session.menu === 'initials' && this.session.arcade.draft) {
                        const target = this.session.arcade.draft.returnTo;
                        this.session.arcade.draft = null; this.session.openMenu(target); this.session.save();
                    }
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
            if (!ep) throw new Error('2048 entry point missing');
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
        if (this.rendererInfo && !this.ready) this.configureRenderer(this.rendererInfo);
        this.visible = true; this.focused = true; this.updateVisibility();
        return Promise.resolve(this.rhmiApplication.openEntryState(uuid)).catch((e) => logger.warn(e.message));
    }
    updateVisibility() {
        if (this.ending) return;
        const shown = this.visible && this.ready && (this.renderMode !== 'layer' || this.focused);
        const active = shown && this.focused;
        this.gpu.show(shown);
        this.gpu.grab(active && this.inputVia === 'renderer');
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
            while (this.visible && !this.ending && (target = !this.session.menu ? 1 : ['confirm', 'help', 'scores', 'initials'].indexOf(this.session.menu) >= 0 ? 3 : 2) !== this.depth) {
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
        } catch (e) { logger.warn('2048 menu navigation: ' + e.message); }
        finally { this.navigating = false; }
    }
    async exitApp() {
        this.visible = false; this.updateVisibility();
        await this.navigationTask;
        if (this.directInput) {
            const input = this.directInput; this.directInput = null;
            if (this.inputVia === 'direct') this.ready = false;
            await input.close();
        }
        this.navigating = true;
        try {
            while (this.depth > 1) await this.rhmiApplication.closeState(STATES[--this.depth]);
            await this.rhmiApplication.closeState(STATE);
        } catch (e) { logger.warn('2048 close: ' + e.message); }
        finally { this.navigating = false; }
    }
    shutdown() {
        if (this.ending) return this.ending;
        this.session.save(); this.gpu.grab(false); this.gpu.show(false); this.gpu.close(); clearInterval(this.keepalive);
        clearTimeout(this.hideTimer); clearTimeout(this.focusTimer);
        this.ending = Promise.resolve(this.directInput && this.directInput.close()).then(() => this.destroyBundles())
            .catch((e) => logger.warn(e.message)).then(() => process.exit(0));
        return this.ending;
    }
}
const app = new App2048();
app.start().catch((e) => logger.error('2048 start: ' + e.message));
