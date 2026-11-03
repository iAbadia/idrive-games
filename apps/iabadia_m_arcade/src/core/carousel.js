// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// UI clock only: never changes gameplay time or starts its own timer.
class Carousel {
    constructor(count, index) {
        this.count = count;
        this.snap(index || 0);
    }
    snap(index) {
        this.target = index;
        this.motion = null;
    }
    position(now) {
        if (!this.motion) return this.target;
        const m = this.motion,
            p = Math.max(0, Math.min(1, (now - m.started) / m.duration));
        return m.from + (this.target - m.from) * (1 - Math.pow(1 - p, 3));
    }
    move(steps, now) {
        const from = this.position(now);
        this.target += steps;
        this.motion = {
            from,
            started: now,
            duration: 220 + Math.min(100, Math.abs(this.target - from) * 20),
        };
        return ((this.target % this.count) + this.count) % this.count;
    }
    active(now) {
        return !!(
            this.motion && now - this.motion.started < this.motion.duration
        );
    }
    advance(now) {
        const dirty = !!this.motion;
        if (this.motion && !this.active(now)) this.motion = null;
        return dirty;
    }
}
module.exports = { Carousel };
