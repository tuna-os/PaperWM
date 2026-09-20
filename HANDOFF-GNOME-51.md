# PaperWM GNOME 51 Port Handoff

## Objective

Port this fork of PaperWM to GNOME Shell 51 while preserving the existing
PaperWM workflow and keeping the default desktop recoverable if the extension
fails to load.

Repository: `https://github.com/tuna-os/PaperWM`

## Current state

- Fork owner: `tuna-os`
- Checked-out branch: `release`
- Upstream remote: `https://github.com/paperwm/PaperWM.git`
- Fork remote: `https://github.com/tuna-os/PaperWM.git`
- Fork base commit: `8bf6dd264f60d6c0c402b63df7b424b888959a48`
- `metadata.json` declares GNOME Shell 45 through 50; it does not declare 51.
- The installed copy was PaperWM 50.0.1 on GNOME Shell 51.0 under Wayland.

PaperWM is disabled on the test machine so normal GNOME window switching
remains available. Do not enable a development build in the main session until
it passes the isolated-session checks below.

## Reproduction

Enabling PaperWM produced this GNOME Shell error:

```text
Extension paperwm@paperwm.github.com: ImportError: Unable to load file from:
resource:///org/gnome/shell/ui/pointerWatcher.js
The resource at “/org/gnome/shell/ui/pointerWatcher.js” does not exist
```

The import is currently in `stackoverlay.js`:

```js
import * as PointerWatcher from 'resource:///org/gnome/shell/ui/pointerWatcher.js';
```

The failure occurs while GNOME Shell initializes the extension, before PaperWM
can provide its normal behavior. Stock GNOME bindings were correct:

```text
switch-windows=['<Alt>Tab']
switch-windows-backward=['<Shift><Alt>Tab']
```

## Upstream status checked on 2026-09-20

- Upstream says the active `release` line supports GNOME 45–50.
- GNOME Extensions marks PaperWM 50.0.1 active for GNOME 45–50.
- No official GNOME 51 branch or GNOME 51-specific open PR was found.
- Upstream issue #1167 documents a separate GNOME 50 API break involving
  `Gio.DesktopAppInfo` and `GioUnix.DesktopAppInfo`, so compatibility work is
  likely broader than the first `pointerWatcher` import failure.

References:

- https://github.com/paperwm/PaperWM
- https://github.com/paperwm/PaperWM/pulls
- https://github.com/paperwm/PaperWM/issues/1167
- https://extensions.gnome.org/extension/6099/paperwm/

## Recommended work sequence

1. Create a `gnome-51` development branch from `release`; keep `release` as
   the known upstream-compatible baseline.
2. Search every import under `resource:///org/gnome/shell/` and every use of
   GNOME Shell private APIs. Do not stop after fixing `pointerWatcher.js`.
3. Port `stackoverlay.js` to the GNOME 51 pointer/input API, or isolate the
   pointer-watching feature behind a compatibility adapter so the extension
   can load without it.
4. Fix the `Gio.DesktopAppInfo` usages identified by issue #1167, using
   `GioUnix.DesktopAppInfo` where GNOME 51 requires it.
5. Update `metadata.json` to include `51` only after the extension loads and
   basic behavior passes on GNOME 51.
6. Update the README with the supported-version and rollback procedure.

## Validation requirements

Use a nested GNOME Shell session, VM, or separate test login. Avoid testing
an untrusted build in the primary desktop session.

Minimum checks:

- Extension enables without GNOME Shell errors or `State: ERROR`.
- GNOME overview opens and closes.
- Alt-Tab and Shift-Alt-Tab switch windows.
- PaperWM window and workspace navigation work.
- Normal, dialog, transient, fullscreen, and maximized windows do not leave
  stale focus or input grabs.
- Pointer hover/focus works on one and multiple monitors.
- Disabling PaperWM restores stock GNOME window switching.

Useful commands:

```bash
gnome-shell --version
gnome-extensions enable paperwm@paperwm.github.com
gnome-extensions info paperwm@paperwm.github.com
journalctl --user -b --no-pager | rg 'paperwm|gnome-shell|mutter'
```

For a failed test, disable it from another terminal or TTY:

```bash
gnome-extensions disable paperwm@paperwm.github.com
```

## Handoff completion criteria

The next agent should leave a focused `gnome-51` branch with small,
reviewable commits; a reproducible nested-session procedure; clean journal
output for enabling on GNOME 51; and an updated compatibility statement that
distinguishes PaperWM version numbers from GNOME Shell versions.
