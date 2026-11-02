// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const { Game, LEVELS } = require('./game.js');
const TILT = { 1: 'up', 2: 'up', 4: 'right', 5: 'right', 7: 'down', 8: 'down', 10: 'left', 11: 'left' };
const MODES = ['Reveal', 'Flag', 'Menu'];
class Session {
    constructor(saved, opts) {
        this.opts = opts || {}; this.game = new Game(saved, this.opts.random); this.visible = false;
        this.menu = saved ? 'pause' : null; this.focus = 0; this.mode = 0; this.last = null; this.stamp = null; this.notice = '';
        this.pendingLevel = this.game.level; this.pulse = null; this.save();
    }
    now() { return this.opts.now ? this.opts.now() : Date.now(); }
    advance(now) {
        now = now === undefined ? this.now() : now;
        if (this.stamp !== null && this.visible && !this.menu && this.game.status === 'playing') this.game.elapsed += Math.max(0, now - this.stamp);
        this.stamp = now;
        if (this.pulse && now - this.pulse.started >= 160) this.pulse = null;
    }
    animating() { return !!(this.visible && this.pulse); }
    snapshot() { this.advance(); return this.game.snapshot(); }
    save() {
        try { if (this.opts.save) this.opts.save(this.snapshot()); this.notice = ''; }
        catch (e) { this.notice = 'Could not save. Try again.'; }
    }
    changed() { if (this.opts.change) this.opts.change(); }
    openMenu(kind) { this.advance(); this.menu = kind || (this.game.ended() ? this.game.status : 'pause'); this.focus = 0; this.pulse = null; }
    labels() {
        if (this.menu === 'confirm') return ['Cancel', 'Start new game'];
        if (this.menu === 'difficulty') return Object.keys(LEVELS).map(k => LEVELS[k].label).concat(['Back to menu']);
        if (this.menu === 'help' || this.menu === 'times') return ['Back to menu'];
        return (this.game.ended() ? [] : ['Resume']).concat(['New game', 'Difficulty', 'Best times', 'How to play', 'Exit app']);
    }
    visibility(on) { this.advance(); if (!on) { this.openMenu(); this.save(); } this.visible = on; this.stamp = this.now(); this.last = null; if (on && this.game.ended()) this.openMenu(); this.changed(); }
    select() {
        const label = this.labels()[this.focus];
        if (label === 'Resume') { this.menu = null; this.mode = 0; }
        else if (label === 'New game') { this.pendingLevel = this.game.level; this.openMenu('confirm'); }
        else if (label === 'Difficulty') this.openMenu('difficulty');
        else if (label === 'Best times') this.openMenu('times');
        else if (label === 'How to play') this.openMenu('help');
        else if (label === 'Back to menu' || label === 'Cancel') this.openMenu();
        else if (label === 'Start new game') { this.game.newGame(this.pendingLevel); this.menu = null; this.mode = 0; this.save(); }
        else if (label === 'Exit app') { this.save(); this.visible = false; if (this.opts.exit) this.opts.exit(); }
        else {
            const level = Object.keys(LEVELS).find(k => LEVELS[k].label === label);
            if (level) { this.pendingLevel = level; this.openMenu('confirm'); }
        }
        this.stamp = this.now();
    }
    input(action, amount) {
        if (!this.visible) return;
        this.advance();
        if (this.menu) {
            if (action === 'rotate' || action === 'up' || action === 'down') this.focus = Math.max(0, Math.min(this.labels().length - 1, this.focus + (action === 'rotate' ? amount : action === 'up' ? -1 : 1)));
            else if (action === 'center') this.select();
            else if (action === 'back') { if (this.menu === 'pause') { this.menu = null; this.mode = 0; } else this.openMenu(); }
        } else if (action === 'back') this.openMenu();
        else if (action === 'rotate') this.mode = ((this.mode + amount) % 3 + 3) % 3;
        else if (['up', 'down', 'left', 'right'].indexOf(action) >= 0) { this.game.move(action); this.save(); }
        else if (action === 'center') {
            if (this.mode === 2) this.openMenu();
            else {
                const changed = this.mode === 1 ? this.game.flag(this.game.cursor) : this.game.reveal(this.game.cursor);
                if (changed) {
                    this.pulse = { cell: this.game.cursor, started: this.now() };
                    if (this.game.status === 'won') {
                        const best = this.game.best[this.game.level];
                        if (best === null || this.game.elapsed < best) this.game.best[this.game.level] = this.game.elapsed;
                    }
                    if (this.game.ended()) this.openMenu();
                    this.save();
                }
            }
        }
        this.changed();
    }
    ccu(e) {
        if (!this.visible) { this.last = null; return; }
        const prev = this.last; e = Object.assign({}, e);
        if (prev) { if ([0,1,2].indexOf(e.press) < 0) e.press = prev.press; if (e.tilt !== 0 && !TILT[e.tilt]) e.tilt = prev.tilt; }
        this.last = e; if (!prev) return;
        if ((e.press === 1 || e.press === 2) && prev.press === 0) { this.input('center'); return; }
        if (TILT[e.tilt] && TILT[e.tilt] !== TILT[prev.tilt]) this.input(TILT[e.tilt]);
        if (e.knob !== 65535 && prev.knob !== 65535) {
            const delta = ((e.knob - prev.knob + 32768) & 65535) - 32768;
            if (delta && Math.abs(delta) <= 24) this.input('rotate', delta);
        }
    }
}
module.exports = { Session, MODES };
