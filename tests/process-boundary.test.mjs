import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// GNOME Shell loads extension.js in the shell process and prefs.js in a
// separate GTK process, and each can load only its own libraries. The
// preferences process has no St, Clutter, Meta or Shell and no
// resource:///org/gnome/shell/ modules; the shell cannot load GTK (that is why
// acceleratorparse.js replaces Gtk.accelerator_parse). Modules both sides
// import, such as settings.js and workspace.js, must stay loadable in both.
const root = new URL('../', import.meta.url);

const SHELL_ONLY = [
    /^gi:\/\/(St|Clutter|Meta|Shell|Mtk|Cogl)(\?|$)/,
    /^resource:\/\/\/org\/gnome\/shell\//,
];
const PREFS_ONLY = [
    /^gi:\/\/(Gtk|Gdk|Adw)(\?|$)/,
    /^resource:\/\/\/org\/gnome\/Shell\/Extensions\//,
];

// Static `import ... from '...'`, `export ... from '...'` and `import '...'`.
const IMPORT = /^\s*(?:import|export)\b[^;'"()=]*?\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm;

function importsOf(file) {
    const source = readFileSync(new URL(file, root), 'utf8');
    return [...source.matchAll(IMPORT)].map(m => m[1] ?? m[2]);
}

// Every module reachable from `entry`, mapped to its import specifiers.
function graphFrom(entry) {
    const graph = new Map();
    const queue = [entry];
    while (queue.length > 0) {
        const file = queue.shift();
        if (graph.has(file))
            continue;
        const specs = importsOf(file);
        graph.set(file, specs);
        for (const spec of specs.filter(s => s.startsWith('.')))
            queue.push(new URL(spec, new URL(file, root)).href.slice(root.href.length));
    }
    return graph;
}

function violations(entry, forbidden) {
    const found = [];
    for (const [file, specs] of graphFrom(entry)) {
        for (const spec of specs.filter(s => forbidden.some(re => re.test(s))))
            found.push(`${file} imports ${spec}`);
    }
    return found;
}

test('both entry points reach the shared modules', () => {
    for (const entry of ['prefs.js', 'extension.js']) {
        const reached = graphFrom(entry);
        for (const shared of ['settings.js', 'workspace.js'])
            assert.ok(reached.has(shared), `${entry} should reach ${shared}`);
    }
});

test('modules the preferences window loads import no shell-process library', () => {
    assert.deepEqual(violations('prefs.js', SHELL_ONLY), []);
});

test('modules the shell loads import no GTK or prefs-only module', () => {
    assert.deepEqual(violations('extension.js', PREFS_ONLY), []);
});

// `make release` ships every top-level *.js (JS_FILES in the Makefile), so a
// module that neither entry point imports is shipped and never loaded.
test('every module the release archive ships is loaded by an entry point', () => {
    const reached = new Set([...graphFrom('extension.js').keys(), ...graphFrom('prefs.js').keys()]);
    const shipped = readdirSync(root).filter(f => f.endsWith('.js'));
    assert.deepEqual(shipped.filter(f => !reached.has(f)), []);
});
