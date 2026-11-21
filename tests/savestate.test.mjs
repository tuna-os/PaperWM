import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveState } from '../saveState.js';

function fakeSpace(uuid, { index = 0, targetX = 0, windows = [], selected } = {}) {
    return {
        uuid,
        index,
        targetX,
        selectedWindow: selected,
        getWindows: () => windows,
    };
}

function fakeWindow(log, name) {
    return { lower: () => log.push(name) };
}

test('a new SaveState holds nothing', () => {
    const state = new SaveState();
    assert.equal(state.hasPrevMonitors(), false);
    assert.equal(state.hasPrevSpaces(), false);
    assert.equal(state.hasPrevTargetX(), false);
});

test('update with save=false leaves the state untouched', () => {
    const state = new SaveState();
    const spaces = new Map([['ws', fakeSpace('a', { targetX: 5, windows: [{}] })]]);
    state.update(spaces, false);
    assert.equal(state.hasPrevSpaces(), false);
    assert.equal(state.hasPrevTargetX(), false);
});

test('update remembers spaces and finds them by uuid', () => {
    const state = new SaveState();
    const a = fakeSpace('a');
    const b = fakeSpace('b');
    state.update(new Map([['w1', a], ['w2', b]]));
    assert.equal(state.hasPrevSpaces(), true);
    assert.equal(state.getPrevSpaceByUUID('b'), b);
    assert.equal(state.getPrevSpaceByUUID('missing'), undefined);
});

test('update keeps targetX only for non-empty spaces that have scrolled', () => {
    const state = new SaveState();
    const win = {};
    state.update(new Map([
        ['w1', fakeSpace('scrolled', { targetX: 40, windows: [win] })],
        ['w2', fakeSpace('at-origin', { targetX: 0, windows: [win] })],
        ['w3', fakeSpace('empty', { targetX: 40, windows: [] })],
    ]));
    assert.deepEqual([...state.prevTargetX], [['scrolled', 40]]);
});

test('update rebuilds targetX instead of accumulating stale entries', () => {
    const state = new SaveState();
    const win = {};
    state.update(new Map([['w', fakeSpace('a', { targetX: 40, windows: [win] })]]));
    state.update(new Map([['w', fakeSpace('a', { targetX: 0, windows: [win] })]]));
    assert.equal(state.hasPrevTargetX(), false);
});

test('update records the space index for each monitor connector', () => {
    const state = new SaveState();
    const spaces = new Map();
    spaces.monitors = new Map([
        [{ connector: 'DP-1' }, fakeSpace('a', { index: 0 })],
        [{ connector: 'HDMI-1' }, fakeSpace('b', { index: 2 })],
    ]);
    state.update(spaces);
    assert.deepEqual([...state.prevMonitors], [['DP-1', 0], ['HDMI-1', 2]]);
});

test('update keeps earlier monitor entries across calls', () => {
    const state = new SaveState();
    const first = new Map();
    first.monitors = new Map([[{ connector: 'DP-1' }, fakeSpace('a', { index: 0 })]]);
    state.update(first);
    state.update(new Map());
    assert.deepEqual([...state.prevMonitors], [['DP-1', 0]]);
});

test('prepare lowers windows from the selected one down, then back up the stack', () => {
    const state = new SaveState();
    const log = [];
    const w = ['w0', 'w1', 'w2', 'w3'].map(n => fakeWindow(log, n));
    const space = fakeSpace('a', { windows: w, selected: w[1] });
    state.prepare(new Map([['ws', space]]));
    assert.deepEqual(log, ['w1', 'w2', 'w3', 'w1', 'w0']);
});

test('prepare leaves a space alone when its selected window is not in it', () => {
    const state = new SaveState();
    const log = [];
    const space = fakeSpace('a', {
        windows: [fakeWindow(log, 'w0')],
        selected: fakeWindow(log, 'stranger'),
    });
    state.prepare(new Map([['ws', space]]));
    assert.deepEqual(log, []);
});

test('prepare captures state for restore', () => {
    const state = new SaveState();
    const space = fakeSpace('a', { targetX: 9, windows: [fakeWindow([], 'w')] });
    state.prepare(new Map([['ws', space]]));
    assert.equal(state.getPrevSpaceByUUID('a'), space);
    assert.equal(state.prevTargetX.get('a'), 9);
});
