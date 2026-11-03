// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const TILT = {
    1: 'up',
    2: 'up',
    4: 'right',
    5: 'right',
    7: 'down',
    8: 'down',
    10: 'left',
    11: 'left',
};
const PRESS = { RELEASED: 0, PRESSED: 1, PRESSED_LONG: 2, SHORT: 1, LONG: 2 };
const DIR = {
    NORTH: 1,
    N: 1,
    EAST: 4,
    E: 4,
    SOUTH: 7,
    S: 7,
    WEST: 10,
    W: 10,
    NEUTRAL: 0,
    CENTER: 0,
};
class Input {
    constructor(send) {
        this.send = send;
        this.reset();
    }
    reset() {
        this.last = null;
    }
    ccu(raw) {
        if (
            !raw ||
            !Number.isInteger(raw.knob) ||
            raw.knob < 0 ||
            raw.knob > 65535
        )
            return;
        const last = this.last,
            e = {
                knob: raw.knob,
                press:
                    typeof raw.press === 'string'
                        ? PRESS[raw.press.toUpperCase()] !== undefined
                            ? PRESS[raw.press.toUpperCase()]
                            : Number(raw.press)
                        : raw.press,
                tilt:
                    typeof raw.tilt === 'string'
                        ? DIR[raw.tilt.toUpperCase()] !== undefined
                            ? DIR[raw.tilt.toUpperCase()]
                            : Number(raw.tilt)
                        : raw.tilt,
            };
        if (![0, 1, 2].includes(e.press)) e.press = last ? last.press : 0;
        if (e.tilt !== 0 && !TILT[e.tilt]) e.tilt = last ? last.tilt : 0;
        this.last = e;
        if (!last) return;
        if (e.press > 0 && last.press === 0) {
            this.send('center');
            return;
        }
        if (TILT[e.tilt] && TILT[e.tilt] !== TILT[last.tilt]) {
            this.send(TILT[e.tilt]);
            return;
        }
        if (e.knob !== 65535 && last.knob !== 65535) {
            const n = ((e.knob - last.knob + 32768) & 65535) - 32768;
            if (n && Math.abs(n) <= 24) this.send('rotate', n);
        }
    }
}
module.exports = { Input };
