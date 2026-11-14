import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// Any local account can create a name in the shared temporary directory
// first, and the sticky bit then stops us replacing or deleting it. Files the
// shell and the preferences window pass to each other belong in the user's
// runtime directory (GLib.get_user_runtime_dir()).
test('extension code does not use the shared temporary directory', () => {
    const root = new URL('../', import.meta.url);
    const offenders = readdirSync(root)
        .filter(name => name.endsWith('.js'))
        .filter(name => /get_tmp_dir\s*\(/.test(readFileSync(new URL(name, root), 'utf8')));
    assert.deepEqual(offenders, []);
});
