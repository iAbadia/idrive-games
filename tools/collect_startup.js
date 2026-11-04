// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Pipe this file to `ssh <existing destination> node -`. Node 8; read-only.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const APP = 'iabadia_m_arcade';
function redact(text) {
    return String(text)
        .replace(/-----BEGIN[^\r\n]*PRIVATE KEY-----[\s\S]*?(?:-----END[^\r\n]*PRIVATE KEY-----|$)/g, '[private key redacted]')
        .replace(/\bBearer\s+[^\s"',;]+/gi, 'Bearer [redacted]')
        .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g, '[token redacted]')
        .replace(/((?:access[_-]?token|refresh[_-]?token|password|secret|authorization|vin)["']?\s*[:=]\s*["']?)[^\s"',;}]+/gi, '$1[redacted]')
        .replace(/\b[A-HJ-NPR-Z0-9]{17}\b/g, '[VIN redacted]');
}
function collect(options) {
    options = options || {};
    const root = options.root || '/var/opt/public/oap';
    const run = options.run || ((command, args, cwd) => cp.spawnSync(command, args, {
        encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024,
        cwd: cwd || undefined,
    }));
    const report = { capturedAt: new Date().toISOString(), node: process.version, apps: [], errors: [] };
    function json(file, limit) {
        if (fs.statSync(file).size > limit) throw Error('diagnostic file exceeds limit');
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    function error(e) { return redact(e.message || e).slice(0, 2000); }
    let homes = [];
    try { homes = fs.readdirSync(root).filter((n) => /^oap_\d+$/.test(n)).slice(0, 512); }
    catch (e) { report.errors.push(error(e)); }
    homes.forEach((home) => {
        const base = path.join(root, home), source = path.join(base, 'source');
        let pkg;
        try { pkg = json(path.join(source, 'package.json'), 128 * 1024); }
        catch (e) { return; }
        if (pkg.name !== APP) return;
        const app = { home, version: pkg.version, main: pkg.main };
        report.apps.push(app);
        try {
            const trace = json(path.join(base, 'data/m-arcade/startup.json'), 128 * 1024);
            app.startup = {
                startedAt: trace.startedAt,
                events: (Array.isArray(trace.events) ? trace.events : []).slice(-32).map((e) => ({
                    time: e.time, stage: redact(e.stage).slice(0, 200),
                    detail: e.detail ? redact(e.detail).slice(0, 2000) : undefined,
                })),
            };
        } catch (e) { app.startupError = error(e); }
        try {
            const build = json(path.join(source, 'javascript/build.json'), 64 * 1024);
            app.build = {
                version: build.version,
                main: build.main && { path: build.main.path, from: redact(build.main.from) },
                sdkModulesFrom: build.bundle && redact(build.bundle.sdkModulesFrom),
            };
        } catch (e) { app.buildError = error(e); }
        app.syntax = [];
        [pkg.main, 'javascript/app.js'].filter((v, i, all) => typeof v === 'string' && all.indexOf(v) === i).forEach((relative) => {
            try {
                const file = fs.realpathSync(path.resolve(source, relative));
                if (file.indexOf(fs.realpathSync(source) + path.sep) !== 0) throw Error('launcher outside app source');
                const result = run(process.execPath, ['--check', file], source);
                app.syntax.push({ file: relative, status: result.status,
                    error: result.error ? error(result.error) : redact(result.stderr || '').slice(0, 4000) });
            } catch (e) { app.syntax.push({ file: relative, error: error(e) }); }
        });
    });
    try {
        const result = run('systemctl', ['is-active', 'mgu-renderd.service']);
        report.renderer = { status: result.status, state: redact(result.stdout || '').trim(),
            error: result.error ? error(result.error) : redact(result.stderr || '').slice(0, 1000) };
    } catch (e) { report.renderer = { error: error(e) }; }
    try {
        const result = run('journalctl', ['-u', 'oapcontroller', '--since', '-15 minutes', '-n', '1500', '--no-pager', '-o', 'cat']);
        // Redact before selecting context so multiline private keys cannot leak.
        const lines = redact(result.stdout || '').split(/\r?\n/), selected = new Set();
        lines.forEach((line, index) => {
            if (!/iabadia_m_arcade|M Arcade|\bMARC\b|e17aec7c-d021-47b9-8ae2-1b2460436f4d|3132366a-5d7b-4f4e-977c-61e774d8dd5a|Error:|Cannot find module|uncaught exception|out of memory|initializ.*(?:fail|timeout)|start.*(?:fail|timeout)/i.test(line)) return;
            for (let n = Math.max(0, index - 2); n <= Math.min(lines.length - 1, index + 5); n++) selected.add(n);
        });
        report.journal = {
            status: result.status,
            lines: Array.from(selected).sort((a, b) => a - b).slice(-240).map((n) => lines[n].slice(0, 2000)),
            error: result.error ? error(result.error) : redact(result.stderr || '').slice(0, 2000),
        };
    } catch (e) { report.journal = { error: error(e) }; }
    return report;
}
if (!module.parent) process.stdout.write(JSON.stringify(collect(), null, 2) + '\n');
module.exports = { collect, redact };
