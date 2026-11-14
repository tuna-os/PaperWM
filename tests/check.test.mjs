import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    checkMetadata, checkArchive, schemaIdsOf, REQUIRED_RELEASE_FILES,
} from '../scripts/check.mjs';

const good = {
    uuid: 'paperwm@paperwm.github.com',
    'shell-version': ['49', '50'],
    'version-name': '50.0.1',
    'settings-schema': 'org.gnome.shell.extensions.paperwm',
};
const ctx = { uuid: good.uuid, schemaIds: ['org.gnome.shell.extensions.paperwm'] };

test('the repository metadata.json passes', () => {
    const meta = JSON.parse(readFileSync(new URL('../metadata.json', import.meta.url)));
    const xml = readFileSync(new URL(
        '../schemas/org.gnome.shell.extensions.paperwm.gschema.xml', import.meta.url), 'utf8');
    const uuid = /^EXT_ID\s*:=\s*(\S+)/m.exec(
        readFileSync(new URL('../Makefile', import.meta.url), 'utf8'))[1];
    assert.deepEqual(checkMetadata(meta, { uuid, schemaIds: schemaIdsOf(xml) }), []);
});

test('metadata with a wrong uuid is rejected', () => {
    const errs = checkMetadata({ ...good, uuid: 'other@example.com' }, ctx);
    assert.equal(errs.length, 1);
    assert.match(errs[0], /uuid/);
});

test('metadata with bad shell-version entries is rejected', () => {
    assert.match(checkMetadata({ ...good, 'shell-version': [] }, ctx)[0], /non-empty/);
    assert.match(checkMetadata({ ...good, 'shell-version': [50] }, ctx)[0], /not a version string/);
    assert.match(checkMetadata({ ...good, 'shell-version': ['50', '50'] }, ctx)[0], /duplicate/);
});

test('metadata without a version-name or with a bad version is rejected', () => {
    const { 'version-name': _, ...noName } = good;
    assert.match(checkMetadata(noName, ctx)[0], /version-name/);
    assert.match(checkMetadata({ ...good, version: 0 }, ctx)[0], /version must be/);
});

test('metadata naming an undefined settings-schema is rejected', () => {
    assert.match(checkMetadata({ ...good, 'settings-schema': 'x.y' }, ctx)[0], /settings-schema/);
});

test('schemaIdsOf lists every schema id', () => {
    const xml = '<schemalist><schema id="a.b" path="/a/"/><schema\n  id="a.c"></schema></schemalist>';
    assert.deepEqual(schemaIdsOf(xml), ['a.b', 'a.c']);
});

test('an archive with every runtime file passes', () => {
    assert.deepEqual(checkArchive([...REQUIRED_RELEASE_FILES, 'resources/', 'tiling.js']), []);
});

test('an archive missing a runtime file is rejected', () => {
    const entries = REQUIRED_RELEASE_FILES.filter(f => f !== 'schemas/gschemas.compiled');
    assert.deepEqual(checkArchive(entries), ['archive is missing schemas/gschemas.compiled']);
});

test('an archive carrying development-only files is rejected', () => {
    const errs = checkArchive([...REQUIRED_RELEASE_FILES, 'tests/lib.test.mjs', 'README.md', 'vm.nix']);
    assert.equal(errs.length, 3);
    assert.ok(errs.every(e => /development-only/.test(e)));
});
