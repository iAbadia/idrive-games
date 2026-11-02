#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Robert Nisipeanu
'use strict';
/** Catalog fields, reproducible source export, submodule handling and game requirements. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const cp = require('child_process');
const { buildArtifact } = require('../tool_artifact.js');
const { components, catalogEntry, exportHead } = require('../release.js');
const catalog = require('../catalog.js');

/* The members of a tgz the packer wrote (ustar), by name. */
function untgz(file) {
    const tar = zlib.gunzipSync(fs.readFileSync(file));
    const out = {};
    for (let off = 0; off + 512 <= tar.length;) {
        const name = tar.toString('utf8', off, off + 100).replace(/\0.*$/, '');
        if (!name) {
            break;
        }
        const size = parseInt(tar.toString('utf8', off + 124, off + 136).replace(/\0.*$/, '').trim(), 8);
        out[name] = tar.slice(off + 512, off + 512 + size);
        off += 512 + Math.ceil(size / 512) * 512;
    }
    return out;
}

const tests = [];
function test(name, fn) {
    tests.push({ name, fn });
}

function fixtureTool(root, c) {
    const dir = path.join(root, 'native', c.id);
    fs.mkdirSync(path.join(dir, 'systemd'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'hook.js'), 'console.log("{}");\n');
    fs.writeFileSync(path.join(dir, 'systemd', `${c.id}.service`), '[Service]\nExecStart=/bin/true\n');
    fs.writeFileSync(path.join(dir, 'component.json'), JSON.stringify(c, null, 2));
    return dir;
}

const FIXTURE = {
    id: 'fixture-tool',
    kind: 'tool',
    version: '1.2.3',
    title: 'Fixture',
    requires: { 'cluster-render': '0.1.0', 'mgu-deploy': '0.7.0' },
    mguHmi: ['ID7'],
    uninstallable: true,
    keepRunning: true,
    activate: ['node', 'hook.js', 'activate'],
    deactivate: ['node', 'hook.js', 'deactivate'],
    files: [{ path: 'hook.js', mode: '0644' }],
    units: [{ name: 'fixture-tool.service', from: 'systemd/fixture-tool.service' }],
    restart: ['fixture-tool.service']
};

test('a tool artifact keeps the fields the deploy tool reads', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mgu-rel-test-'));
    const dir = fixtureTool(root, FIXTURE);
    const out = buildArtifact(dir, path.join(root, 'out'));
    const m = JSON.parse(untgz(out)['component.json'].toString('utf8'));
    assert.deepStrictEqual(m.activate, FIXTURE.activate);
    assert.deepStrictEqual(m.deactivate, FIXTURE.deactivate);
    assert.deepStrictEqual(m.mguHmi, ['ID7']);
    assert.strictEqual(m.keepRunning, true);
    assert.strictEqual(m.requires, undefined, 'the catalog\'s');
    assert.strictEqual(m.uninstallable, undefined, 'the catalog\'s');
    assert.strictEqual(m.mguProvides, undefined, 'only fields the tool sets');
    assert.deepStrictEqual(m.files.map((f) => f.path), ['hook.js']);
});

test('a tool catalog entry carries requires, mguHmi and uninstallable; the catalog check accepts it', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mgu-rel-test-'));
    fs.mkdirSync(path.join(root, 'apps'));
    fixtureTool(root, FIXTURE);
    const c = components(root).find((x) => x.id === 'fixture-tool');
    const artifact = buildArtifact(path.join(root, 'native', 'fixture-tool'), path.join(root, 'out'));
    const entry = catalogEntry(c, artifact);
    assert.deepStrictEqual(entry.requires, FIXTURE.requires);
    assert.deepStrictEqual(entry.mguHmi, ['ID7']);
    assert.strictEqual(entry.uninstallable, true);
    const parsed = catalog.parse(JSON.stringify({ schema: 2, components: [entry] }));
    assert.deepStrictEqual(parsed.components[0].requires, FIXTURE.requires);
});

test('a malformed requires, mguHmi or uninstallable is refused', () => {
    [{ requires: { 'cluster-render': '0.1' } }, { requires: ['cluster-render'] }, { mguHmi: ['ID9'] }, { mguHmi: [] }, { uninstallable: 'yes' }]
        .forEach((bad) => {
            const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mgu-rel-test-'));
            fs.mkdirSync(path.join(root, 'apps'));
            fixtureTool(root, Object.assign({}, FIXTURE, bad));
            assert.throws(() => components(root), /requires|mguHmi|uninstallable/, JSON.stringify(bad));
        });
});

test('the build tree holds a submodule at its recorded commit; one its checkout lacks is an error', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mgu-rel-test-'));
    const g = (cwd, args) => cp.execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false']
        .concat(args), { cwd, encoding: 'utf8' }).trim();
    const sub = path.join(root, 'sub');
    fs.mkdirSync(sub);
    g(sub, ['init', '-q']);
    g(sub, ['config', 'core.autocrlf', 'false']);
    fs.writeFileSync(path.join(sub, 'lib.txt'), 'one\n');
    g(sub, ['add', 'lib.txt']);
    g(sub, ['commit', '-q', '-m', 'one']);
    const one = g(sub, ['rev-parse', 'HEAD']);
    const main = path.join(root, 'main');
    fs.mkdirSync(main);
    g(main, ['init', '-q']);
    g(main, ['config', 'core.autocrlf', 'false']);
    fs.writeFileSync(path.join(main, 'a.txt'), 'a\n');
    g(main, ['add', 'a.txt']);
    g(main, ['update-index', '--add', '--cacheinfo', `160000,${one},third_party/lib`]);
    g(main, ['commit', '-q', '-m', 'main']);
    fs.mkdirSync(path.join(main, 'third_party'));
    fs.renameSync(sub, path.join(main, 'third_party', 'lib'));
    // the checkout moves on: HEAD's commit is what is built
    fs.writeFileSync(path.join(main, 'third_party', 'lib', 'lib.txt'), 'two\n');
    g(path.join(main, 'third_party', 'lib'), ['commit', '-q', '-am', 'two']);
    const dir = exportHead(main);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'a.txt'), 'utf8'), 'a\n');
    assert.strictEqual(fs.readFileSync(path.join(dir, 'third_party', 'lib', 'lib.txt'), 'utf8'), 'one\n');
    g(main, ['update-index', '--cacheinfo', `160000,${'1'.repeat(40)},third_party/lib`]);
    g(main, ['commit', '-q', '-m', 'a commit the checkout lacks']);
    assert.throws(() => exportHead(main), /git archive 1{40} in third_party[\\/]lib failed/);
});

test('2048 catalog declares its renderer dependency and ID7/ID8 compatibility', () => {
    const all = components();
    assert.strictEqual(all.length, 4);
    const app = all.find(c => c.id === 'iabadia_2048');
    assert.strictEqual(app.id, 'iabadia_2048');
    assert.deepStrictEqual(app.mguHmi, ['ID7', 'ID8']);
    assert.deepStrictEqual(app.requires, { 'mgu-render': '0.6.9' });
    assert.strictEqual(app.uninstallable, true);
});

let failed = 0;
test('the Store branch manifest lists every game with matching source metadata', () => {
    const root = path.resolve(__dirname, '../..');
    const repo = JSON.parse(fs.readFileSync(path.join(root, 'mgu-repo.json'), 'utf8'));
    assert.strictEqual(repo.schema, 1);
    const apps = components().filter((c) => c.kind === 'app');
    assert.deepStrictEqual(repo.components.map((c) => c.id).sort(), apps.map((c) => c.id).sort());
    repo.components.forEach((c) => {
        const app = apps.find((a) => a.id === c.id);
        const manifest = JSON.parse(fs.readFileSync(path.join(root, c.path, 'mgu-app.json'), 'utf8'));
        assert.strictEqual(c.kind, 'app'); assert.strictEqual(c.build, 'unit');
        assert.strictEqual(manifest.id, c.id); assert.strictEqual(manifest.version, app.version);
        assert.deepStrictEqual(c.requires, app.requires); assert.deepStrictEqual(c.mguHmi, app.mguHmi);
        manifest.modules.forEach((m) => assert(fs.existsSync(path.join(root, c.path, m))));
    });
});
tests.forEach((t) => {
    try {
        t.fn();
        console.log(`ok   ${t.name}`);
    } catch (e) {
        failed++;
        console.log(`FAIL ${t.name}\n     ${e && e.stack}`);
    }
});
console.log(`${tests.length - failed}/${tests.length} passed`);
process.exitCode = failed ? 1 : 0;
