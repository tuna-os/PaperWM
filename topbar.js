import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { Settings, Utils, Tiling, Scratch } from './imports.js';
import * as TopbarWidgets from './topbarWidgets.js';

export {
    createButton,
    PopupMenuEntry,
    FocusIcon,
    FocusButton,
    OpenPositionIcon,
    OpenPositionButton,
    WorkspaceMenu,
    switchToNextOpenPositionMode,
    setOpenPositionMode,
} from './topbarWidgets.js';

// eslint-disable-next-line no-undef
const workspaceManager = global.workspace_manager;
// eslint-disable-next-line no-undef
const display = global.display;

/*
  Functionality related to the top bar, often called the statusbar.
 */

export let panelBox = Main.layoutManager.panelBox;

export let menu, focusButton, openPositionButton;
let openPrefs, screenSignals, signals, gsettings;
let activeOpenWindowPositions;

export function enable (extension) {
    activeOpenWindowPositions = [
        {
            mode: Settings.OpenWindowPositions.RIGHT,
            active: () => Settings.prefs.open_window_position_option_right,
        },
        {
            mode: Settings.OpenWindowPositions.LEFT,
            active: () => Settings.prefs.open_window_position_option_left,
        },
        {
            mode: Settings.OpenWindowPositions.START,
            active: () => Settings.prefs.open_window_position_option_start,
        },
        {
            mode: Settings.OpenWindowPositions.END,
            active: () => Settings.prefs.open_window_position_option_end,
        },
        {
            mode: Settings.OpenWindowPositions.DOWN,
            active: () => Settings.prefs.open_window_position_option_down,
        },
        {
            mode: Settings.OpenWindowPositions.UP,
            active: () => Settings.prefs.open_window_position_option_up,
        },
    ];

    openPrefs = () => extension.openPreferences();
    gsettings = extension.getSettings();

    screenSignals = [];
    signals = new Utils.Signals();

    TopbarWidgets.configure({
        activeOpenWindowPositions,
        gsettings,
        openPrefs,
        signals,
        updateWorkspaceIndicator,
    });

    Main.panel.statusArea.activities.hide();

    menu = new TopbarWidgets.WorkspaceMenu();
    focusButton = new TopbarWidgets.FocusButton();
    openPositionButton = new TopbarWidgets.OpenPositionButton();

    Main.panel.addToStatusArea('WorkspaceMenu', menu, 1, 'left');
    Main.panel.addToStatusArea('FocusButton', focusButton, 2, 'left');
    Main.panel.addToStatusArea('OpenPositionButton', openPositionButton, 3, 'left');

    /* This causes a crash on GNOME 48
    Tiling.spaces.forEach(s => {
        s.workspaceLabel.clutter_text.set_font_description(menu.label.clutter_text.font_description);
    });*/

    fixWorkspaceIndicator();
    fixFocusModeIcon();
    fixOpenPositionIcon();
    fixStyle();

    screenSignals.push(
        workspaceManager.connect_after('workspace-switched',
            (_workspaceManager, _from, to) => updateWorkspaceIndicator(to)));

    signals.connect(Main.overview, 'showing', fixTopBar);
    signals.connect(Main.overview, 'hidden', () => {
        fixTopBar();
    });

    signals.connect(gsettings, 'changed::disable-topbar-styling', (_settings, _key) => {
        if (Settings.prefs.disable_topbar_styling) {
            removeStyles();
        }
        else {
            fixStyle();
        }
    });

    signals.connect(gsettings, 'changed::show-window-position-bar', (_settings, _key) => {
        const spaces = Tiling.spaces;
        spaces.forEach(s => s.showPositionBarChanged());
        fixStyle();
    });

    signals.connect(gsettings, 'changed::show-workspace-indicator', (_settings, _key) => {
        fixWorkspaceIndicator();
    });

    signals.connect(gsettings, 'changed::show-focus-mode-icon', (_settings, _key) => {
        fixFocusModeIcon();
    });

    signals.connect(gsettings, 'changed::show-open-position-icon', (_settings, _key) => {
        fixOpenPositionIcon();
    });

    signals.connect(panelBox, 'show', () => {
        fixTopBar();
    });
    // signals.connect(panelBox, 'hide', () => {
    //     fixTopBar();
    // });

    signals.connect(Main.panel, 'scroll-event', (_actor, event) => {
        topBarScrollAction(event);
    });

    /**
     * Set clear-style when hiding overview.
     */
    signals.connect(Main.overview, 'hiding', () => {
        fixStyle();
    });
}

export function disable() {
    signals.destroy();
    signals = null;
    focusButton.destroy();
    focusButton = null;
    openPositionButton.destroy();
    openPositionButton = null;
    activeOpenWindowPositions = null;
    menu.destroy();
    menu = null;
    Main.panel.statusArea.activities.show();
    // remove PaperWM style classes names for Main.panel
    removeStyles();

    screenSignals.forEach(id => workspaceManager.disconnect(id));
    screenSignals = [];
    openPrefs = null;
    gsettings = null;
    TopbarWidgets.reset();
}

/**
 * Action when mouse scrolling on topbar.
 * @param {Clutter.event} event
 * @returns
 */
export function topBarScrollAction(event) {
    if (!Settings.prefs.topbar_mouse_scroll_enable) {
        return Clutter.EVENT_PROPAGATE;
    }

    // if topbar workspaceMenu (indicator) has pointer, exit
    if (menu && menu.has_pointer) {
        return Clutter.EVENT_PROPAGATE;
    }

    // same check for gnome pill
    const pill = Main.panel?.statusArea?.activities;
    if (pill && pill.has_pointer) {
        return Clutter.EVENT_PROPAGATE;
    }

    let direction = event.get_scroll_direction();
    switch (direction) {
    case Clutter.ScrollDirection.DOWN:
        Tiling.spaces?.activeSpace.switchRight(false);
        break;
    case Clutter.ScrollDirection.UP:
        Tiling.spaces?.activeSpace.switchLeft(false);
        break;
    }
    const selected = Tiling.spaces?.activeSpace?.selectedWindow;
    if (selected) {
        let hasFocus = selected.has_focus();
        selected.foreach_transient(mw => {
            hasFocus = mw.has_focus() || hasFocus;
        });
        if (hasFocus) {
            Tiling.focus_handler(selected);
        } else {
            Main.activateWindow(selected);
        }
    }

    return Clutter.EVENT_PROPAGATE;
}

export function showWorkspaceMenu(show = false) {
    if (show) {
        Main.panel.statusArea.activities.hide();
        menu.show();
    }
    else {
        menu.hide();
        Main.panel.statusArea.activities.show();
    }
}

/**
 * Returns monitor where panel is currently on.
 * @returns Monitor
 */
export function panelMonitor() {
    return Main.layoutManager.primaryMonitor;
}

/**
 * Returns space where panel is currently on.
 * @returns Tiling.Space
 */
export function panelSpace() {
    return Tiling?.spaces?.monitors?.get(panelMonitor());
}

export function setNoBackgroundStyle() {
    if (Settings.prefs.disable_topbar_styling) {
        return;
    }

    removeStyles();
    Main.panel.add_style_class_name('background-clear');
}

export function setTransparentStyle() {
    if (Settings.prefs.disable_topbar_styling) {
        return;
    }

    removeStyles();
    Main.panel.add_style_class_name('topbar-transparent-background');
}

export function removeStyles() {
    ['background-clear', 'topbar-transparent-background'].forEach(s => {
        Main.panel.remove_style_class_name(s);
    });
}

/**
 * Applies correct style based on whether we use the windowPositionBar or not.
 */
export function fixStyle() {
    const space = panelSpace();
    if (
        Settings.prefs.show_window_position_bar &&
        (space?.showPositionBar ?? true)
    ) {
        setNoBackgroundStyle();
    }
    else {
        setTransparentStyle();
    }
}

export function fixTopBar() {
    const space = panelSpace();
    if (!space)
        return;

    const normal = !Main.overview.visible && !Tiling.inPreview;
    // selected is current (tiled) selected window (can be different to focused window)
    const selected = space.selectedWindow;
    const focused = display.focus_window;
    const focusIsFloatOrScratch = focused && (space.isFloating(focused) || Scratch.isScratchWindow(focused));
    // check if is currently fullscreened (check focused-floating, focused-scratch, and selected/tiled window)
    const fullscreen = focusIsFloatOrScratch ? focused.fullscreen : selected && selected.fullscreen;

    if (normal && !space.showTopBar) {
        hideTopBar();
    }
    else if (normal && fullscreen) {
        hideTopBar();
    }
    else {
        showTopBar();
    }
}

export function showTopBar() {
    panelBox.show();
}

export function hideTopBar() {
    panelBox.hide();
}

export function fixWorkspaceIndicator() {
    const show = Settings.prefs.show_workspace_indicator;
    if (show) {
        Main.panel.statusArea.activities.hide();
        menu.show();
    }
    else {
        menu.hide();
        Main.panel.statusArea.activities.show();
    }
}

export function fixFocusModeIcon() {
    Settings.prefs.show_focus_mode_icon ? focusButton.show() : focusButton.hide();
    Tiling.spaces.forEach(s => s.showFocusModeIcon());
}

export function fixOpenPositionIcon() {
    Settings.prefs.show_open_position_icon ? openPositionButton.show() : openPositionButton.hide();
}

/**
   Override the activities label with the workspace name.
   let workspaceIndex = 0
*/
export function updateWorkspaceIndicator(index) {
    let spaces = Tiling.spaces;
    let space = spaces?.spaceOf(workspaceManager.get_workspace_by_index(index));
    if (space && space.monitor === panelMonitor()) {
        setWorkspaceName(space.name);

        // also update focus mode
        focusButton.setFocusMode(space.focusMode);
    }
}

/**
 * Refreshes topbar workspace indicator.
 */
export function refreshWorkspaceIndicator() {
    const space = panelSpace();
    if (space) {
        updateWorkspaceIndicator(space.index);
    }
}

export function setWorkspaceName (name) {
    menu && menu.setName(name);
}
