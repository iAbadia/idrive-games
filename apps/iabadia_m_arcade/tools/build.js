// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs = require('fs'),
    path = require('path'),
    link = require('../../../tools/oap_link.js');
const ROOT = path.join(__dirname, '..'),
    SRC = path.join(ROOT, 'src'),
    OUT = path.join(ROOT, 'package-src');
function walk(dir) {
    return fs
        .readdirSync(dir)
        .sort()
        .reduce((out, name) => {
            const f = path.join(dir, name);
            return out.concat(
                fs.statSync(f).isDirectory()
                    ? walk(f)
                    : f.endsWith('.js')
                      ? [f]
                      : [],
            );
        }, []);
}
// A small scanner, not a text-wide replacement: comments/strings remain byte-for-byte.
// Local module names are plain static literals. Dynamic requires are deliberately unsupported.
function rewrite(source, resolve) {
    let out = '',
        i = 0;
    while (i < source.length) {
        const start = i,
            c = source[i],
            n = source[i + 1];
        if (c === '/' && n === '/') {
            i = source.indexOf('\n', i);
            if (i < 0) i = source.length;
            out += source.slice(start, i);
            continue;
        }
        if (c === '/' && n === '*') {
            const end = source.indexOf('*/', i + 2);
            if (end < 0) throw Error('Unclosed comment');
            i = end + 2;
            out += source.slice(start, i);
            continue;
        }
        if (c === '"' || c === "'" || c === '`') {
            i++;
            while (i < source.length) {
                if (source[i] === '\\') {
                    i += 2;
                    continue;
                }
                if (source[i++] === c) break;
            }
            out += source.slice(start, i);
            continue;
        }
        if (/[A-Za-z_$]/.test(c)) {
            i++;
            while (i < source.length && /[\w$]/.test(source[i])) i++;
            const token = source.slice(start, i);
            if (token === 'require' && source.slice(i).match(/^\s*\(/)) {
                const match = source
                    .slice(i)
                    .match(/^\s*\(\s*(['"])([^'"\\]+)\1\s*\)/);
                if (!match)
                    throw Error('Dynamic or escaped require is unsupported');
                out += "require('" + resolve(match[2]) + "')";
                i += match[0].length;
            } else out += token;
            continue;
        }
        out += c;
        i++;
    }
    return out;
}
function generate() {
    fs.mkdirSync(OUT, { recursive: true });
    const files = walk(SRC),
        map = new Map(),
        names = new Set();
    files.forEach((f) => {
        const rel = path.relative(SRC, f).split(path.sep).join('/'),
            name = rel.replace(/\//g, '_');
        if (names.has(name)) throw Error('Module name collision: ' + name);
        map.set(path.resolve(f), name);
        names.add(name);
    });
    const outputs = [];
    files.forEach((f) => {
        const content = rewrite(fs.readFileSync(f, 'utf8'), (name) => {
            if (!name.startsWith('.')) return name;
            const dest = path.resolve(
                path.dirname(f),
                name.endsWith('.js') ? name : name + '.js',
            );
            if (!map.has(dest))
                throw Error('Unresolved local module ' + name + ' in ' + f);
            return './' + map.get(dest);
        });
        const name = map.get(path.resolve(f));
        fs.writeFileSync(path.join(OUT, name), content);
        outputs.push(name);
    });
    // Remove only stale generated JavaScript, never source or user data.
    fs.readdirSync(OUT)
        .filter((n) => n.endsWith('.js') && !names.has(n))
        .forEach((n) => fs.unlinkSync(path.join(OUT, n)));
    const modules = ['app.js']
        .concat(outputs.filter((n) => n !== 'app.js').sort())
        .map((n) => 'package-src/' + n);
    const m = {
        schema: 1,
        id: 'iabadia_m_arcade',
        version: '0.1.0',
        tree: 'iabadia_m_arcade@0.1.0',
        modules,
        sdk: ['oap-sdk/src/core/OnlineApp.js', 'oap-sdk/src/logging/logging'],
    };
    fs.writeFileSync(
        path.join(ROOT, 'mgu-app.json'),
        JSON.stringify(m, null, 2) + '\n',
    );
    const images = path.join(
        ROOT,
        m.tree,
        'rhmiData/variantGroups/Common/images',
    );
    fs.copyFileSync(
        path.join(ROOT, 'assets/icon.png'),
        path.join(images, 'iabadia_m_arcade_icon.png'),
    );
    const icons = path.join(ROOT, m.tree, 'config/icons');
    fs.mkdirSync(icons, { recursive: true });
    require('../src/ui/icons.js').loadIcons(
        path.join(ROOT, 'assets/games'),
        require('../src/core/registry.js').games,
    );
    require('../src/core/registry.js').games.forEach((g) =>
        fs.copyFileSync(
            path.join(ROOT, 'assets/games', g.icon),
            path.join(icons, g.icon),
        ),
    );
    return m;
}
function main() {
    const m = generate(),
        file = path.join(ROOT, m.id + '@' + m.version + '.src.tgz');
    link.packSource(ROOT, file);
    console.log(path.basename(file));
    const i = process.argv.indexOf('--sdk');
    if (i >= 0) {
        if (!process.argv[i + 1]) throw Error('--sdk needs a donor');
        link.build(ROOT, path.join(ROOT, m.id + '@' + m.version + '.tgz'), {
            donors: [path.resolve(process.argv[i + 1])],
        });
    }
}
module.exports = { generate, rewrite };
if (require.main === module) {
    try {
        main();
    } catch (e) {
        console.error(e.stack);
        process.exitCode = 1;
    }
}
