/**
 * Saves current state for controlled restarts of PaperWM.
 *
 * The workspace collection is passed to each operation so persistence does not
 * depend on tiling.js module state.
 */
export class SaveState {
    constructor() {
        this.prevMonitors = new Map();
        this.prevSpaces = new Map();
        this.prevTargetX = new Map();
    }

    hasPrevMonitors() {
        return this.prevMonitors?.size > 0;
    }

    hasPrevSpaces() {
        return this.prevSpaces?.size > 0;
    }

    hasPrevTargetX() {
        return this.prevTargetX?.size > 0;
    }

    getPrevSpaceByUUID(uuid) {
        return [...this.prevSpaces.values()].find(s => uuid === s.uuid);
    }

    /**
     * Updates save state based on current monitors, spaces, and layouts.
     *
     * @param {Map} spaces current workspace-to-space collection
     * @param {boolean} save whether to capture the collection
     */
    update(spaces, save = true) {
        if (!save) {
            return;
        }

        /**
         * For monitors, since these are upgraded with "connector" field,
         * which we delete on disable. Before we delete this field, we want
         * a copy on connector (and index) to restore space to monitor.
         */
        if (spaces?.monitors) {
            for (let [monitor, space] of spaces.monitors) {
                this.prevMonitors.set(monitor.connector, space.index);
            }
        }

        // Store space targetX values.
        this.prevTargetX = new Map();
        spaces.forEach(s => {
            if (s.getWindows().length > 0 && s.targetX !== 0) {
                this.prevTargetX.set(s.uuid, s.targetX);
            }
        });

        // Save spaces for window restore.
        this.prevSpaces = new Map(spaces);
    }

    /**
     * Prepares state for restoring on next enable.
     *
     * @param {Map} spaces current workspace-to-space collection
     */
    prepare(spaces) {
        this.update(spaces);
        this.prevSpaces.forEach(space => {
            let windows = space.getWindows();
            let selected = windows.indexOf(space.selectedWindow);
            if (selected === -1) {
                return;
            }
            // Stack windows correctly for controlled restarts.
            for (let i = selected; i < windows.length; i++) {
                windows[i].lower();
            }
            for (let i = selected; i >= 0; i--) {
                windows[i].lower();
            }
        });
    }
}
