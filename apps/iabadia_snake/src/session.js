// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const { Game, LEVELS } = require('./game.js');
const TILT = { 1: 'up', 2: 'up', 4: 'right', 5: 'right', 7: 'down', 8: 'down', 10: 'left', 11: 'left' };
class Session {
    constructor(saved, opts) {
        this.opts = opts || {}; this.game = new Game(saved, this.opts.random); this.visible = false;
        this.menu = saved ? 'pause' : null; this.focus = 0; this.mode = 0; this.last = null; this.stamp = null; this.notice = '';
        this.initials = 'AAA'; this.letter = 0; this.pendingLevel = this.game.level; this.pulse = null; this.save();
    }
    now() { return this.opts.now ? this.opts.now() : Date.now(); }
    advance(now) {
        now = now === undefined ? this.now() : now;
        if (this.stamp === null || now < this.stamp) this.stamp = now;
        if (!this.visible || this.menu || this.game.status !== 'playing') { this.stamp = now; return; }
        const delay = LEVELS[this.game.level].ms;
        // One step at most: renderer stalls never cause invisible catch-up deaths.
        if(now-this.stamp >= delay) {
            this.stamp=now;
            const ate=this.game.step();
            if(this.game.ended()) {
                if(this.game.score>this.game.best[this.game.level]) {
                    this.game.best[this.game.level]=this.game.score;this.game.names[this.game.level]=null;
                    this.initials='AAA';this.letter=0;this.menu='initials';
                } else this.menu=this.game.status;
                this.focus=0;
            }
            if(ate)this.save();
        }
    }
    animating() { return !!(this.visible && !this.menu && this.game.status === 'playing'); }
    snapshot() { this.advance(); return this.game.snapshot(); }
    save() {
        try { if (this.opts.save) this.opts.save(this.snapshot()); this.notice = ''; }
        catch (e) { this.notice = 'Could not save. Try again.'; }
    }
    changed() { if (this.opts.change) this.opts.change(); }
    openMenu(kind) { this.advance(); this.menu = kind || (this.game.ended() ? this.game.status : 'pause'); this.focus = 0; this.pulse = null; this.save(); }
    labels() {
        if (this.menu === 'initials') return [];
        if (this.menu === 'confirm') return ['Cancel', 'Start new game'];
        if (this.menu === 'difficulty') return Object.keys(LEVELS).map(k => LEVELS[k].label).concat(['Back to menu']);
        if (this.menu === 'help' || this.menu === 'scores') return ['Back to menu'];
        return (this.game.ended() ? [] : ['Resume']).concat(['New game', 'Speed', 'High scores', 'How to play', 'Exit app']);
    }
    visibility(on) {
        this.advance();
        if(!on) { if(this.menu!=='initials') this.openMenu(); this.save(); }
        this.visible=on;this.stamp=this.now();this.last=null;
        if(on&&this.game.ended()&&this.game.score>0&&this.game.names[this.game.level]===null&&this.game.best[this.game.level]===this.game.score)this.openMenu('initials');
        this.changed();
    }
    select() {
        const label = this.labels()[this.focus];
        if (label === 'Resume') { this.menu = null; this.mode = 0; }
        else if (label === 'New game') { this.pendingLevel = this.game.level; this.openMenu('confirm'); }
        else if (label === 'Speed') this.openMenu('difficulty');
        else if (label === 'High scores') this.openMenu('scores');
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
        if (this.menu === 'initials') {
            if (action === 'rotate' || action === 'up' || action === 'down') {
                const chars = this.initials.split(''), delta = action === 'rotate' ? amount : action === 'up' ? 1 : -1;
                chars[this.letter] = String.fromCharCode(65 + ((chars[this.letter].charCodeAt(0)-65+delta)%26+26)%26); this.initials = chars.join('');
            } else if (action === 'left' || action === 'right') this.letter = Math.max(0,Math.min(2,this.letter+(action==='left'?-1:1)));
            else if (action === 'center') {
                if (this.letter < 2) this.letter++;
                else { this.game.names[this.game.level] = this.initials; this.save(); if (!this.notice) this.openMenu(this.game.status); }
            } else if (action === 'back') this.openMenu(this.game.status);
            this.changed(); return;
        }
        if (this.menu) {
            if (action === 'rotate' || action === 'up' || action === 'down') this.focus = Math.max(0, Math.min(this.labels().length - 1, this.focus + (action === 'rotate' ? amount : action === 'up' ? -1 : 1)));
            else if (action === 'center') this.select();
            else if (action === 'back') { if (this.menu === 'pause' && !this.game.ended()) { this.menu = null; this.stamp = this.now(); } else this.openMenu(); }
        } else if (action === 'back' || action === 'center') this.openMenu();
        else if (action === 'rotate' || ['up','down','left','right'].includes(action)) {
            const ready=this.game.status==='ready';this.game.steer(action,amount);if(ready)this.stamp=this.now();
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
module.exports = { Session };
