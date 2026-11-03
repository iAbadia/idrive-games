// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

const DIRECTIONS = ['left', 'right', 'up', 'down'];
function valid(s) {
    return s && s.version === 1 && Array.isArray(s.board) && s.board.length === 16 &&
        s.board.every((n) => Number.isSafeInteger(n) && n >= 0 && (n === 0 || (n >= 2 && Math.log2(n) % 1 === 0))) &&
        s.board.some(Boolean) && Number.isSafeInteger(s.score) && s.score >= 0 &&
        Number.isSafeInteger(s.best) && s.best >= s.score && typeof s.continued === 'boolean';
}
function line(board, indexes) {
    const cells = indexes.filter((i) => board[i]).map((i) => ({ value: board[i], from: i })), out = [], moves = [], merged = [];
    let score = 0;
    for (let i = 0; i < cells.length; i++) {
        const to = indexes[out.length], tile = cells[i];
        moves.push({ from: tile.from, to, value: tile.value });
        if (cells[i + 1] && tile.value === cells[i + 1].value) {
            const n = tile.value * 2; out.push(n); score += n;
            moves.push({ from: cells[i + 1].from, to, value: tile.value }); merged.push(to); i++;
        } else out.push(tile.value);
    }
    while (out.length < 4) out.push(0);
    return { cells: out, score, moves, merged };
}
function slide(board, direction) {
    if (DIRECTIONS.indexOf(direction) < 0) throw new Error('Unknown direction');
    const out = board.slice(), moves = [], merged = []; let score = 0;
    for (let a = 0; a < 4; a++) {
        const indexes = [];
        for (let b = 0; b < 4; b++) indexes.push(direction === 'left' ? a * 4 + b :
            direction === 'right' ? a * 4 + 3 - b : direction === 'up' ? b * 4 + a : (3 - b) * 4 + a);
        const r = line(board, indexes); score += r.score;
        moves.push.apply(moves, r.moves); merged.push.apply(merged, r.merged);
        indexes.forEach((i, b) => { out[i] = r.cells[b]; });
    }
    return { board: out, score, moves, merged, changed: out.some((v, i) => v !== board[i]) };
}
function canMove(board) { return DIRECTIONS.some((d) => slide(board, d).changed); }

class Game {
    constructor(saved, random) {
        this.random = random || Math.random;
        this.best = 0;
        if (valid(saved)) {
            this.board = saved.board.slice(); this.score = saved.score;
            this.best = saved.best; this.continued = saved.continued;
        } else this.newGame();
    }
    newGame() { this.board = Array(16).fill(0); this.score = 0; this.continued = false; this.spawn(); this.spawn(); }
    spawn() {
        const empty = this.board.map((v, i) => v === 0 ? i : -1).filter((i) => i >= 0);
        if (!empty.length) return null;
        const index = empty[Math.floor(this.random() * empty.length)];
        this.board[index] = this.random() < 0.9 ? 2 : 4;
        return index;
    }
    move(direction) {
        if (this.over() || this.won()) return false;
        const r = slide(this.board, direction);
        if (!r.changed) return false;
        this.board = r.board; this.score += r.score; this.best = Math.max(this.best, this.score);
        this.lastMove = { moves: r.moves, merged: r.merged, spawned: this.spawn() };
        return true;
    }
    over() { return !canMove(this.board); }
    won() { return !this.continued && this.board.some((v) => v >= 2048); }
    snapshot() { return { version: 1, board: this.board.slice(), score: this.score, best: this.best, continued: this.continued }; }
}
module.exports = { Game, slide, canMove, valid };
