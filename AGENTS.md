# AGENTS.md — agent guide for tuna-os/PaperWM

A **GNOME Shell extension** providing scrollable tiling of windows and per-monitor
workspaces. This is the TunaOS fork of [paperwm/PaperWM](https://github.com/paperwm/PaperWM).

Human docs: [`README.md`](README.md) (features, keybindings, installation),
[`CONTRIBUTING.md`](CONTRIBUTING.md) (development, testing).

## Key Facts Before You Start

1. **This is a fork of upstream PaperWM.** The canonical repository is
   [paperwm/PaperWM](https://github.com/paperwm/PaperWM). The TunaOS fork tracks
   upstream changes and may apply TunaOS-specific patches.

2. **Default branch is `release`.** All active development targets `release`.
   For older GNOME versions, checkout the appropriate branch:
   - `release` — GNOME 45-50 (current development)
   - `gnome-44` — GNOME 42-44 (EOL)
   - `gnome-40` — GNOME 40-41 (EOL)
   - `gnome-3.38` — GNOME 3.28-3.38 (EOL)

3. **GNOME Shell extension architecture.** Runs inside GNOME Shell process,
   not as a standalone application. See `CONTRIBUTING.md` for local testing.

4. **DCO sign-off required.** All commits must include `git commit -s`.

## Layout & Key Files

| Path | Purpose |
|------|---------|
| `extension.js` | Main extension code |
| `prefs.js` | Preferences UI |
| `keybindings.js` | Keyboard shortcut definitions |
| `schemas/` | GSettings schema XML |
| `metadata.json` | Extension metadata |
| `CONTRIBUTING.md` | Development and testing procedures |
| `HANDOFF-GNOME-51.md` | Notes for GNOME 51 support |

## Build & Test

The extension is interpreted JavaScript — there is no separate build step.

### Local Development

1. **Clone and checkout the target branch:**
   ```bash
   git clone https://github.com/tuna-os/PaperWM.git
   cd PaperWM
   git checkout release  # or gnome-44, gnome-40, etc.
   ```

2. **Symlink into extensions directory:**
   ```bash
   mkdir -p ~/.local/share/gnome-shell/extensions
   ln -s "$(pwd)" ~/.local/share/gnome-shell/extensions/paperwm@paperwm.github.com
   ```

3. **Compile schema:**
   ```bash
   glib-compile-schemas schemas/
   ```

4. **Enable and test:**
   ```bash
   gnome-extensions enable paperwm@paperwm.github.com
   ```

5. **Test updates without logout:**
   ```bash
   gnome-extensions disable paperwm@paperwm.github.com
   gnome-extensions enable paperwm@paperwm.github.com
   ```

### Validation Before Submission

```bash
# Verify GSettings schema
glib-compile-schemas --strict --dry-run schemas/

# Verify metadata
python3 -m json.tool metadata.json > /dev/null
```

### Monitoring Logs

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

## Upstream Syncing

To pull changes from upstream:

```bash
git remote add upstream https://github.com/paperwm/PaperWM.git 2>/dev/null || true
git fetch upstream release
git merge upstream/release  # or cherry-pick specific commits
```

When merging upstream, test thoroughly — PaperWM changes to window management
can have subtle effects on existing workflows.

## Version Support Matrix

| GNOME Version | Branch | Status | EOL Status |
|---|---|---|---|
| 45-50 | `release` | ✅ Current | Active |
| 42-44 | `gnome-44` | ⚠️ Maintenance | EOL |
| 40-41 | `gnome-40` | ⚠️ Maintenance | EOL |
| 3.28-3.38 | `gnome-3.38` | ❌ Legacy | EOL |

New features and fixes are only backported to older versions if a contributor
tests and updates related documentation.

## TunaOS-Specific Changes

If your change is specific to TunaOS (not useful upstream), document it clearly
in the commit message. Ideally, keep such patches isolated so they can be easily
rebased during upstream syncs.

Examples of TunaOS-specific changes:
- TunaOS-specific keybindings or workspace defaults
- Integration with TunaOS-specific tools or extensions
- Packaging or distribution customizations

## CI & Workflows

The repository runs validation on each push and pull request:
- GSettings schema validation
- Metadata JSON validation
- Packaging verification

All checks must pass before merging.

## Testing

- **Unit tests:** None currently.
- **Manual testing:** Follow the local development setup above and test in a real GNOME Shell session.
- **Browser testing:** Install from [extensions.gnome.org](https://extensions.gnome.org/extension/6099/paperwm/) for user-facing testing.

The extension requires a display server and GNOME Shell process to function —
there is no headless test runner.

## License

Same as upstream (GPL-3.0-or-later).

## Contributing

For development workflows, testing procedures, and PR guidelines, see
[CONTRIBUTING.md](CONTRIBUTING.md). All commits require DCO sign-off.

For upstream contributions, see [paperwm/PaperWM](https://github.com/paperwm/PaperWM).
