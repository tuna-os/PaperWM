import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AcceleratorParse } from '../acceleratorparse.js';

const p = new AcceleratorParse();

test('accelerator_mods extracts every <Mod> token', () => {
    assert.deepEqual(p.accelerator_mods('<Control><Shift>a'), ['<Control>', '<Shift>']);
    assert.deepEqual(p.accelerator_mods('a'), []);
});

test('accelerator_mask combines modifier bits', () => {
    assert.equal(p.accelerator_mask('a'), 0);
    assert.equal(p.accelerator_mask('<Shift>a'), p.GDK_SHIFT_MASK);
    assert.equal(
        p.accelerator_mask('<Control><Alt>a'),
        p.GDK_CONTROL_MASK | p.GDK_ALT_MASK);
    assert.equal(p.accelerator_mask('<Super>a'), p.GDK_SUPER_MASK);
    assert.equal(p.accelerator_mask('<Hyper>a'), p.GDK_HYPER_MASK);
    assert.equal(p.accelerator_mask('<Meta>a'), p.GDK_META_MASK);
});

test('accelerator_mask accepts Ctrl/Primary aliases and any case', () => {
    assert.equal(p.accelerator_mask('<Ctrl>a'), p.GDK_CONTROL_MASK);
    assert.equal(p.accelerator_mask('<Primary>a'), p.GDK_CONTROL_MASK);
    assert.equal(p.accelerator_mask('<CONTROL>a'), p.GDK_CONTROL_MASK);
});

test('accelerator_mask ignores unknown modifiers', () => {
    assert.equal(p.accelerator_mask('<Bogus>a'), 0);
});

test('accelerator_parse returns [ok, keysym, mask] for a plain key', () => {
    assert.deepEqual(p.accelerator_parse('a'), [true, 0x061, 0]);
    assert.deepEqual(p.accelerator_parse('Escape'), [true, 0xff1b, 0]);
});

test('accelerator_parse strips modifiers before the key lookup', () => {
    assert.deepEqual(
        p.accelerator_parse('<Control><Shift>Tab'),
        [true, 0xff09, p.GDK_CONTROL_MASK | p.GDK_SHIFT_MASK]);
    assert.deepEqual(
        p.accelerator_parse('<Super>Return'),
        [true, 0xff0d, p.GDK_SUPER_MASK]);
});

test('accelerator_parse fails with zeroed key and mask for an unknown key', () => {
    assert.deepEqual(p.accelerator_parse('<Control>NoSuchKey'), [false, 0, 0]);
    assert.deepEqual(p.accelerator_parse(''), [false, 0, 0]);
});

test('accelerator_parse is case sensitive on the key name', () => {
    // Gdk keysym names differ by case ('a' vs 'A'); parse must not fold them.
    const lower = p.accelerator_parse('a');
    const upper = p.accelerator_parse('A');
    assert.equal(lower[0], true);
    assert.equal(upper[0], true);
    assert.notEqual(lower[1], upper[1]);
});

test('_initKeycodeMap builds the map once and rebuilds on force', () => {
    const q = new AcceleratorParse();
    q._initKeycodeMap();
    const first = q.keycodeMap;
    q._initKeycodeMap();
    assert.equal(q.keycodeMap, first);
    q._initKeycodeMap(true);
    assert.notEqual(q.keycodeMap, first);
});
