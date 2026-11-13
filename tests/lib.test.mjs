import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    findNext, findPrev, arrayEqual, eq, swap, in_bounds, indent, sum, zip,
} from '../lib.js';

test('findNext returns the first larger value', () => {
    assert.equal(findNext(2, [1, 3, 5]), 3);
    assert.equal(findNext(0, [1, 3, 5]), 1);
});

test('findNext cycles to the first value when nothing is larger', () => {
    assert.equal(findNext(5, [1, 3, 5]), 1);
    assert.equal(findNext(9, [1, 3, 5]), 1);
});

test('findNext skips values within slack of cur', () => {
    assert.equal(findNext(2, [3, 8], 2), 8);
    assert.equal(findNext(2, [3, 8], 1), 3);
});

test('findPrev returns the last smaller value', () => {
    assert.equal(findPrev(4, [1, 3, 5]), 3);
    assert.equal(findPrev(6, [1, 3, 5]), 5);
});

test('findPrev cycles to the last value when nothing is smaller', () => {
    assert.equal(findPrev(1, [1, 3, 5]), 5);
    assert.equal(findPrev(0, [1, 3, 5]), 5);
});

test('findPrev treats values within slack of cur as equal', () => {
    assert.equal(findPrev(4, [1, 3, 5], 2), 1);
});

test('arrayEqual compares by element', () => {
    assert.equal(arrayEqual([1, 2], [1, 2]), true);
    assert.equal(arrayEqual([1, 2], [1, 3]), false);
    assert.equal(arrayEqual([1, 2], [1, 2, 3]), false);
    assert.equal(arrayEqual([], []), true);
});

test('arrayEqual handles identity and missing arrays', () => {
    const a = [1];
    assert.equal(arrayEqual(a, a), true);
    assert.equal(arrayEqual(null, [1]), false);
    assert.equal(arrayEqual([1], undefined), false);
    assert.equal(arrayEqual(null, null), true);
});

test('eq uses an epsilon', () => {
    assert.equal(eq(0.1 + 0.2, 0.3), true);
    assert.equal(eq(1, 1.1), false);
    assert.equal(eq(1, 1.05, 0.1), true);
});

test('swap exchanges two elements in place', () => {
    const a = [1, 2, 3];
    swap(a, 0, 2);
    assert.deepEqual(a, [3, 2, 1]);
});

test('in_bounds checks both ends', () => {
    assert.equal(in_bounds([1, 2, 3], 0), true);
    assert.equal(in_bounds([1, 2, 3], 2), true);
    assert.equal(in_bounds([1, 2, 3], 3), false);
    assert.equal(in_bounds([1, 2, 3], -1), false);
    assert.equal(in_bounds([], 0), false);
});

test('indent prefixes two spaces per level', () => {
    assert.equal(indent(0, 'x'), 'x');
    assert.equal(indent(3, 'x'), '      x');
});

test('sum adds numbers, empty is zero', () => {
    assert.equal(sum([1, 2, 3]), 6);
    assert.equal(sum([]), 0);
});

test('zip pairs elements and truncates to the shortest input', () => {
    assert.deepEqual(zip([1, 2, 3], ['a', 'b']), [[1, 'a'], [2, 'b']]);
    assert.deepEqual(zip([1], [2], [3]), [[1, 2, 3]]);
    assert.deepEqual(zip([1, 2], []), []);
});
