// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const LEVELS = { beginner: { label: 'Beginner', cols: 9, rows: 9, mines: 10 }, intermediate: { label: 'Intermediate', cols: 16, rows: 16, mines: 40 }, expert: { label: 'Expert', cols: 30, rows: 16, mines: 99 } };
function valid(s) {
    if (!s || s.version !== 1 || !LEVELS[s.level]) return false;
    const d = LEVELS[s.level], n = d.cols * d.rows;
    return ['ready', 'playing', 'won', 'lost'].indexOf(s.status) >= 0 &&
        Array.isArray(s.mines) && s.mines.length === (s.status === 'ready' ? 0 : d.mines) &&
        s.mines.every(i => Number.isInteger(i) && i >= 0 && i < n) && new Set(s.mines).size === s.mines.length &&
        ['revealed', 'flags'].every(k => Array.isArray(s[k]) && s[k].length === n && s[k].every(v => typeof v === 'boolean')) &&
        s.revealed.every((v,i) => !v || !s.flags[i]) && Number.isInteger(s.cursor) && s.cursor >= 0 && s.cursor < n &&
        Number.isFinite(s.elapsed) && s.elapsed >= 0 && s.elapsed <= 31536000000 &&
        s.best && Object.keys(LEVELS).every(k => s.best[k] === null || (Number.isFinite(s.best[k]) && s.best[k] >= 0));
}
class Game {
    constructor(saved, random) {
        this.random = random || Math.random;
        if (valid(saved)) Object.assign(this, JSON.parse(JSON.stringify(saved)));
        else { this.best = { beginner: null, intermediate: null, expert: null }; this.newGame('beginner'); }
    }
    get spec() { return LEVELS[this.level]; }
    newGame(level) {
        if (!LEVELS[level]) throw new Error('Unknown difficulty');
        this.level = level; this.status = 'ready'; this.mines = []; this.revealed = Array(this.spec.cols * this.spec.rows).fill(false);
        this.flags = this.revealed.slice(); this.cursor = 0; this.elapsed = 0;
    }
    neighbors(i) {
        const out = [], c = this.spec.cols, rows = this.spec.rows, x = i % c, y = Math.floor(i / c);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if ((dx || dy) && x + dx >= 0 && x + dx < c && y + dy >= 0 && y + dy < rows) out.push((y + dy) * c + x + dx);
        }
        return out;
    }
    count(i) { return this.neighbors(i).filter(n => this.mines.indexOf(n) >= 0).length; }
    place(first) {
        const safe = new Set([first].concat(this.neighbors(first))), available = [];
        for (let i = 0; i < this.revealed.length; i++) if (!safe.has(i)) available.push(i);
        for (let i = 0; i < this.spec.mines; i++) {
            const k = i + Math.floor(this.random() * (available.length - i));
            [available[i], available[k]] = [available[k], available[i]];
        }
        this.mines = available.slice(0, this.spec.mines); this.status = 'playing';
    }
    move(direction) {
        const c = this.spec.cols, x = this.cursor % c, y = Math.floor(this.cursor / c);
        if (direction === 'left' && x) this.cursor--;
        if (direction === 'right' && x < c - 1) this.cursor++;
        if (direction === 'up' && y) this.cursor -= c;
        if (direction === 'down' && y < this.spec.rows - 1) this.cursor += c;
    }
    flag(i) {
        if (this.ended() || this.revealed[i]) return false;
        if (!this.flags[i] && this.flags.filter(Boolean).length >= this.spec.mines) return false;
        this.flags[i] = !this.flags[i]; return true;
    }
    ended() { return this.status === 'won' || this.status === 'lost'; }
    reveal(i) {
        if (this.ended() || this.flags[i]) return false;
        if (this.status === 'ready') this.place(i);
        let todo = [i];
        if (this.revealed[i]) {
            const ns = this.neighbors(i);
            if (!this.count(i) || ns.filter(n => this.flags[n]).length !== this.count(i)) return false;
            todo = ns.filter(n => !this.flags[n] && !this.revealed[n]);
        }
        let changed = false;
        while (todo.length) {
            const n = todo.pop();
            if (this.revealed[n] || this.flags[n]) continue;
            this.revealed[n] = true; changed = true;
            if (this.mines.indexOf(n) >= 0) { this.status = 'lost'; break; }
            if (!this.count(n)) todo.push.apply(todo, this.neighbors(n).filter(k => !this.revealed[k]));
        }
        if (!this.ended() && this.revealed.filter(Boolean).length === this.revealed.length - this.spec.mines) this.status = 'won';
        return changed;
    }
    snapshot() {
        return { version: 1, level: this.level, status: this.status, mines: this.mines.slice(), revealed: this.revealed.slice(), flags: this.flags.slice(), cursor: this.cursor, elapsed: this.elapsed, best: Object.assign({}, this.best) };
    }
}
module.exports = { Game, LEVELS, valid };
