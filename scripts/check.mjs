#!/usr/bin/env node
// Fast structural checks that need no GNOME Shell and no display.
// Run `make check` locally; CI runs the same command.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SHELL_VERSION = /^\d+(\.\d+)?$/;

// Files a release archive must carry for the extension to load.
export const REQUIRED_RELEASE_FILES = [
    'metadata.json', 'extension.js', 'prefs.js', 'stylesheet.css', 'LICENSE',
    'config/user.js', 'config/user.css', 'schemas/gschemas.compiled',
];

// Development-only paths that must never ship in the archive.
export const FORBIDDEN_RELEASE = [
    /^tests\//, /^scripts\//, /^\.git/, /^\.eslintrc/, /^node_modules\//,
    /^Makefile$/, /^lib\.mk$/, /\.nix$/, /^flake\./, /\.md$/, /\.zip$/,
    /^schemas\/Makefile$/,
];

export function checkMetadata(meta, { uuid, schemaIds = [] }) {
    const errors = [];
    if (meta.uuid !== uuid)
        errors.push(`uuid is ${JSON.stringify(meta.uuid)}, expected ${JSON.stringify(uuid)}`);
    const versions = meta['shell-version'];
    if (!Array.isArray(versions) || versions.length === 0)
        errors.push('shell-version must be a non-empty array');
    else {
        for (const v of versions) {
            if (typeof v !== 'string' || !SHELL_VERSION.test(v))
                errors.push(`shell-version entry ${JSON.stringify(v)} is not a version string`);
        }
        if (new Set(versions).size !== versions.length)
            errors.push('shell-version has duplicate entries');
    }
    if (typeof meta['version-name'] !== 'string' || meta['version-name'] === '')
        errors.push('version-name must be a non-empty string');
    if ('version' in meta && !(Number.isInteger(meta.version) && meta.version > 0))
        errors.push('version must be a positive integer');
    if (meta['settings-schema'] !== undefined && !schemaIds.includes(meta['settings-schema']))
        errors.push(`settings-schema ${JSON.stringify(meta['settings-schema'])} is not defined by any schema XML`);
    return errors;
}

export function checkArchive(entries, { extraRequired = [] } = {}) {
    const errors = [];
    const have = new Set(entries);
    for (const f of [...REQUIRED_RELEASE_FILES, ...extraRequired]) {
        if (!have.has(f))
            errors.push(`archive is missing ${f}`);
    }
    for (const e of entries) {
        if (FORBIDDEN_RELEASE.some(re => re.test(e)))
            errors.push(`archive contains development-only file ${e}`);
    }
    return errors;
}

export function schemaIdsOf(xml) {
    return [...xml.matchAll(/<schema\s[^>]*\bid="([^"]+)"/g)].map(m => m[1]);
}

function run(cmd, args, opts = {}) {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function gitStatus(root) {
    try {
        return run('git', ['status', '--porcelain'], { cwd: root });
    } catch {
        return null; // not a git checkout
    }
}

function main() {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const failures = [];
    const step = (name, fn) => {
        try {
            const errors = fn() ?? [];
            if (errors.length === 0)
                console.log(`ok    ${name}`);
            for (const e of errors) {
                failures.push(`${name}: ${e}`);
                console.log(`FAIL  ${name}: ${e}`);
            }
        } catch (e) {
            const detail = `${e.stderr ?? ''}${e.message}`.trim();
            failures.push(`${name}: ${detail}`);
            console.log(`FAIL  ${name}: ${detail}`);
        }
    };

    const before = gitStatus(root);
    const uuid = /^EXT_ID\s*:=\s*(\S+)/m.exec(readFileSync(join(root, 'Makefile'), 'utf8'))?.[1];
    const schemaFile = 'schemas/org.gnome.shell.extensions.paperwm.gschema.xml';

    step('metadata.json', () => {
        const meta = JSON.parse(readFileSync(join(root, 'metadata.json'), 'utf8'));
        const ids = schemaIdsOf(readFileSync(join(root, schemaFile), 'utf8'));
        return checkMetadata(meta, { uuid, schemaIds: ids });
    });

    step(schemaFile, () => {
        run('glib-compile-schemas', ['--strict', '--dry-run', join(root, 'schemas')]);
    });

    step('make release', () => {
        const zip = join(root, `${uuid}.zip`);
        rmSync(zip, { force: true });
        run('make', ['-C', root, 'release']);
        if (!existsSync(zip))
            return [`${uuid}.zip was not produced`];
        const entries = run('unzip', ['-Z1', zip]).split('\n').filter(Boolean);
        return checkArchive(entries);
    });

    step('clean tree', () => {
        const after = gitStatus(root);
        if (before === null || after === before)
            return [];
        return [`validation changed tracked or unignored files:\n${after}`];
    });

    if (failures.length > 0) {
        console.log(`\n${failures.length} check(s) failed`);
        process.exit(1);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
    main();
