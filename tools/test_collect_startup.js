// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), os = require('os');
const { collect, redact } = require('./collect_startup.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'm-arcade-capture-'));
function directory(p) { if (!fs.existsSync(p)) { directory(path.dirname(p)); fs.mkdirSync(p); } }
function put(file, value) { const p = path.join(root, file); directory(path.dirname(p)); fs.writeFileSync(p, value); }
put('oap_123/source/package.json', JSON.stringify({ name: 'iabadia_m_arcade', version: '0.1.3', main: 'javascript/runner.js', secret: 'do-not-copy-package-secrets' }));
put('oap_123/source/javascript/runner.js', '');
put('oap_123/source/javascript/app.js', '');
put('oap_123/data/m-arcade/startup.json', JSON.stringify({ events: [{ stage: 'initialize failed', detail: 'password=hidden-value' }] }));
put('oap_456/source/package.json', JSON.stringify({ name: 'other_app', version: '1.0' }));
const calls = [];
const report = collect({ root, run(command, args) {
    calls.push({ command, args });
    if (command === 'journalctl') return { status: 0, stdout: 'unrelated output\nM Arcade failed\nTypeError: failure\nBearer hidden-auth\npassword=hidden-value\n-----BEGIN ' + 'PRIVATE KEY-----\nsecret key material\n-----END ' + 'PRIVATE KEY-----\n', stderr: '' };
    return { status: 0, stdout: command === 'systemctl' ? 'active\n' : '', stderr: '' };
} });
assert.equal(report.apps.length, 1);
assert.equal(report.apps[0].version, '0.1.3');
assert.equal(report.apps[0].syntax.length, 2);
assert.equal(report.renderer.state, 'active');
const text = JSON.stringify(report);
assert(text.includes('TypeError: failure'));
['hidden-value', 'hidden-auth', 'secret key material', 'do-not-copy-package-secrets'].forEach((secret) => assert(!text.includes(secret)));
assert(calls.every((c) => (c.command === process.execPath && c.args[0] === '--check') || c.command === 'journalctl' || (c.command === 'systemctl' && c.args[0] === 'is-active')));
assert(!redact('VIN=WBA12345678901234').includes('WBA12345678901234'));
assert(collect({ root: path.join(root, 'absent'), run() { throw Error('command unavailable'); } }).errors.length);
put('oap_123/data/m-arcade/startup.json', 'broken');
assert(collect({ root, run() { return { status: 1 }; } }).apps[0].startupError);
console.log('ok read-only capture: installed version, launcher syntax, missing/corrupt diagnostics, renderer status and secret redaction');

const child = require('child_process').spawnSync(process.execPath, ['-'], {
    input: fs.readFileSync(path.join(__dirname, 'collect_startup.js')),
    encoding: 'utf8', timeout: 30000,
});
assert.equal(child.status, 0, child.stderr);
assert.equal(JSON.parse(child.stdout).node, process.version);
console.log('ok stdin/SSH-pipe execution emits a complete JSON report');
