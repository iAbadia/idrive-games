// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const OnlineApp = require('oap-sdk/src/core/OnlineApp.js');
const logger = require('oap-sdk/src/logging/logging').getSDKLogger();
const path = require('path');
const { Session } = require('./core_session.js');
const storage = require('./core_saves.js');
const { RenderClient } = require('./kit_mgu_render_client.js');
const kit = require('./kit_kit_record.js');
const { draw, WIDTH, HEIGHT } = require('./ui_draw.js');
const STATE = 'ST_OnlineApps_MArcade';
const STATES = [STATE, STATE + '_Game', STATE + '_Menu', STATE + '_Detail'];
const { loadIcons } = require('./ui_icons.js');
const { games } = require('./core_registry.js');
const truth = (v) => v === true || v === 1 || v === '1' || v === 'true';

class AppMArcade extends OnlineApp {
    constructor() {
        super();
        this.visible = false;
        this.focused = true;
        this.ready = false;
        this.ending = false;
        this.depth = 1;
        this.navigating = false;
        this.visibleStates = new Set();
        this.hostReady = false;
        this.pendingEntryUuid = null;
        this.startedAt = new Date().toISOString();
        this.startupEvents = [];
        this.saveDir = path.join(__dirname, '..', '..', 'data', 'm-arcade');
        this.store = new storage.Saves(this.saveDir);
        this.trace('construct');
        this.icons = loadIcons(
            path.join(__dirname, '..', 'config', 'icons'),
            games,
            (id, error) => {
                this.trace('icon unavailable: ' + id, error);
                logger.warn('M Arcade icon ' + id + ': ' + error.message);
            },
        );
        this.session = new Session({
            store: this.store,
            change: () => this.render(),
            exit: () => this.exitApp(),
        });
        this.gpu = new RenderClient('iabadia_m_arcade', logger, {
            kit,
            mode: 'embed',
        });
        this.gpu.fps(30);
        this.gpu.on('ready', (screen, info) => {
            this.trace('renderer connected');
            this.ready = !!(
                info &&
                info.controller &&
                info.modes.indexOf('embed') >= 0
            );
            if (this.ready) {
                const b = info.embedBox,
                    scale = Math.min(b.w / WIDTH, b.h / HEIGHT);
                this.gpu.mode('embed');
                this.gpu.place({
                    x: b.x,
                    y: b.y,
                    w: b.w,
                    h: b.h,
                    scale,
                    ox: (b.w - WIDTH * scale) / 2,
                    oy: (b.h - HEIGHT * scale) / 2,
                });
            }
            this.status(
                this.ready
                    ? ''
                    : 'M Arcade needs the renderer with controller support. Update Renderer in the Store.',
            );
            this.updateVisibility();
        });
        this.gpu.on('close', () => {
            this.ready = false;
            this.updateVisibility();
            this.status('Renderer disconnected. Reconnecting...');
        });
        this.gpu.on('ccu', (e) => this.session.ccu(e));
        this.gpu.on('tick', () => {
            const changed = this.session.advance();
            if (changed || this.dirty || this.session.animating())
                this.render();
        });
        this.gpu.on('closed', () => {
            this.focused = false;
            this.updateVisibility();
        });
        this.on('initialized', () => {
            if (!this.initialization)
                this.initialization = Promise.resolve()
                    .then(() => this.initialize())
                    .catch((e) => this.startupFailure('initialize', e));
        });
        this.on('shutdown', () => this.shutdown());
        this.on('error', (e) => logger.warn('M Arcade: ' + e.message));
        this.on('entryPointExecute', (uuid) => this.open(uuid));
        this.on('changeVisibility', (e) => {
            if (e && e.visible === false) {
                this.visible = false;
                this.updateVisibility();
            }
        });
    }
    trace(stage, error) {
        const event = { time: new Date().toISOString(), stage };
        if (error) event.detail = String(error.stack || error.message || error).slice(0, 2000);
        this.startupEvents.push(event);
        this.startupEvents = this.startupEvents.slice(-32);
        logger.info('M Arcade: ' + stage);
        try {
            this.store.write(path.join(this.store.dir, 'startup.json'), {
                startedAt: this.startedAt,
                events: this.startupEvents,
            });
        } catch (e) {
            // Diagnostics must never prevent launch, including on read-only storage.
            logger.warn('M Arcade startup trace: ' + e.message);
        }
    }
    startupFailure(stage, error) {
        this.trace(stage + ' failed', error);
        this.status('M Arcade could not start: ' + error.message);
        logger.error('M Arcade ' + stage + ': ' + (error.stack || error.message));
    }
    initialize() {
        this.trace('initialize');
        if (!this.rhmiApplication) return this.initialized();
        const data = this.getVisibilityData && this.getVisibilityData();
        const foreground = [
            'ENTRY_POINT', 'LUM', 'BOOKMARK', 'START_WIDGET',
            'TRIGGER_HMI', 'SPEECH_COMMAND',
        ].indexOf((data && data.reason) || this.startReason) >= 0;
        this.state = this.rhmiApplication.getByName(STATE);
        if (!this.state) throw new Error('M Arcade state missing');
        this.states = STATES.map((name) =>
            this.rhmiApplication.getByName(name),
        );
        if (this.states.some((s) => !s))
            throw new Error('M Arcade menu state missing');
        this.states.forEach((state, index) => {
            state.on('visible', (e) => {
                if (truth(e && e.visible)) {
                    this.visibleStates.add(index);
                    this.visible = true;
                    if (!this.navigating) this.focused = true;
                    this.updateVisibility();
                } else {
                    this.visibleStates.delete(index);
                    clearTimeout(this.hideTimer);
                    this.hideTimer = setTimeout(() => {
                        if (!this.visibleStates.size && !this.navigating) {
                            this.visible = false;
                            this.updateVisibility();
                        }
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
                    this.session.nativeBack(this.depth);
                }
                clearTimeout(this.focusTimer);
                this.focusTimer = setTimeout(() => this.updateVisibility(), 0);
            });
        });
        this.rhmiApplication.on('restoreHmi', () => this.render());
        this.rhmiApplication.on('applicationStackChanged', (stack) => {
            if (
                stack &&
                Object.keys(stack).length &&
                !Object.prototype.hasOwnProperty.call(stack, 'ROOT_APP')
            ) {
                this.visible = false;
                this.updateVisibility();
            }
        });
        this.trace('native resources');
        return Promise.all(this.states.map((s) => s.updateResources()))
            .then(() => {
                const descriptions =
                    this.appDescription.application.entryPoints;
                const ep = this.getEntryPoints().find((p) =>
                    descriptions.some(
                        (d) => d.uuid === p.getDescription().uuid,
                    ),
                );
                if (!ep) throw new Error('M Arcade entry point missing');
                const d = ep.getDescription();
                this.trace('entry point registration');
                return ep
                    .init()
                    .then(() =>
                        this.rhmiApplication.mapEntryState(d.uuid, this.state),
                    )
                    .then(() => {
                        this.entryUuid = d.uuid;
                        // Cosmetic metadata failures must not disable the launcher.
                        return Promise.resolve()
                            .then(() => ep.entryPoint.setText(d.textId))
                            .catch((e) => logger.warn('M Arcade entry text: ' + e.message));
                    })
                    .then(() => Promise.resolve()
                        .then(() => ep.entryPoint.setIcon(d.icon))
                        .catch((e) => {
                            this.trace('entry icon unavailable', e);
                            logger.warn('M Arcade entry icon: ' + e.message);
                        }))
                    .then(() => ep.setAvailability('ENABLED'));
            })
            .then(() => {
                this.trace('SDK initialization');
                return Promise.resolve()
                    .then(() => foreground && this.registerActive())
                    .catch((e) => logger.warn('M Arcade activity: ' + e.message))
                    .then(() => this.initialized());
            })
            .then(() => {
                this.trace('waiting for renderer');
                this.gpu.connect();
                this.hostReady = true;
                this.keepalive = setInterval(() => {
                    if (this.visible && this.ready) {
                        this.session.advance();
                        this.render();
                    }
                }, 1000);
                const lastUuid = this.getLastExecutedEntryPointUuid &&
                    this.getLastExecutedEntryPointUuid();
                // A cold foreground start may have no cached SDK UUID yet.
                const uuid = this.pendingEntryUuid ||
                    (foreground && (lastUuid || this.entryUuid));
                this.pendingEntryUuid = null;
                if (uuid) return this.open(uuid);
            });
    }
    status(text) {
        return Promise.resolve().then(() => {
            const c = this.rhmiApplication &&
                this.rhmiApplication.getByName('gameStatus');
            return c && c.setValue(0, 'Text', text, 'Text');
        }).catch((e) => logger.warn(e.message));
    }
    open(uuid) {
        if (!uuid || this.ending) return Promise.resolve();
        if (!this.hostReady) {
            this.pendingEntryUuid = uuid;
            this.trace('launch queued');
            return Promise.resolve();
        }
        this.trace('open entry state');
        return Promise.resolve()
            .then(() => this.rhmiApplication.openEntryState(uuid))
            .then(() => {
                this.visible = true;
                this.focused = true;
                this.updateVisibility();
                this.trace('entry state opened');
            })
            .catch((e) => this.startupFailure('open entry state', e));
    }
    updateVisibility() {
        if (this.ending) return;
        const shown = this.visible && this.ready;
        const active = shown && this.focused;
        this.gpu.show(shown);
        this.gpu.grab(active);
        if (active !== this.session.visible) this.session.visibility(active);
        if (
            this._initialized &&
            this._appStatusService &&
            this.reported !== this.visible
        ) {
            this.reported = this.visible;
            const reports = this.visible
                ? [this.registerActive(), this.registerHmiVisible()]
                : [this.unregisterHmiVisible(), this.registerInactive()];
            reports.forEach((p) =>
                Promise.resolve(p).catch((e) => logger.warn(e.message)),
            );
        }
        this.render();
    }
    render() {
        if (!this.gpu || !this.ready || !this.visible || this.ending) return;
        const frame = draw(this.session, this.icons);
        if (!this.navigating && this.focused)
            this.navigationTask = this.syncNavigation();
        this.dirty = !this.gpu.frame(frame);
    }
    async syncNavigation() {
        if (
            !this.states ||
            this.navigating ||
            !this.visible ||
            !this.focused ||
            this.ending
        )
            return;
        this.navigating = true;
        try {
            let target;
            while (
                this.visible &&
                this.focused &&
                !this.ending &&
                (target = this.session.targetDepth()) !== this.depth
            ) {
                if (this.depth < target) {
                    const name = STATES[this.depth++];
                    try {
                        await this.rhmiApplication.openState(name);
                    } catch (e) {
                        this.depth--;
                        throw e;
                    }
                } else {
                    const name = STATES[--this.depth];
                    try {
                        await this.rhmiApplication.closeState(name);
                    } catch (e) {
                        this.depth++;
                        throw e;
                    }
                }
            }
        } catch (e) {
            logger.warn('M Arcade menu navigation: ' + e.message);
        } finally {
            this.navigating = false;
        }
    }
    async exitApp() {
        this.visible = false;
        this.updateVisibility();
        await this.navigationTask;
        this.navigating = true;
        try {
            while (this.depth > 1)
                await this.rhmiApplication.closeState(STATES[--this.depth]);
            await this.rhmiApplication.closeState(STATE);
        } catch (e) {
            logger.warn('M Arcade close: ' + e.message);
        } finally {
            this.navigating = false;
        }
    }
    shutdown() {
        if (this.ending) return this.ending;
        this.session.checkpoint();
        this.session.visible = false;
        if (this.session.runtime) this.session.runtime.dispose();
        this.gpu.grab(false);
        this.gpu.show(false);
        this.gpu.close();
        clearInterval(this.keepalive);
        clearTimeout(this.hideTimer);
        clearTimeout(this.focusTimer);
        this.ending = Promise.resolve()
            .then(() => this.destroyBundles())
            .catch((e) => logger.warn(e.message))
            .then(() => process.exit(0));
        return this.ending;
    }
}
const app = new AppMArcade();
Promise.resolve().then(() => app.start())
    .catch((e) => app.startupFailure('start', e));
