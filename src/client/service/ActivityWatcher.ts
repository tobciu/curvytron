import type { SocketClient } from '../core/SocketClient.ts';

import { gamepadListener } from '../gamepadListener.ts';

/**
 * Activity watcher
 */
export class ActivityWatcher {
    client: SocketClient;
    focused: any;
    active: any;
    lastActivity: any;
    interval: any;

    /**
     * Tolerated time away from keyboard
     */
    tolerance: number = 60000;

    /**
     * Activity check interval
     */
    checkInterval: number = 10000;

    constructor(client: SocketClient) {
        this.client = client;
        this.focused = true;
        this.active = true;
        this.lastActivity = new Date().getTime();
        this.interval = null;

        this.onFocus = this.onFocus.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.checkInactivity = this.checkInactivity.bind(this);

        window.addEventListener('focus', this.onFocus);
        window.addEventListener('mousemove', this.onFocus);
        window.addEventListener('click', this.onFocus);
        window.addEventListener('keypress', this.onFocus);
        gamepadListener.addEventListener('gamepad:axis', this.onFocus);
        gamepadListener.addEventListener('gamepad:button', this.onFocus);
        window.addEventListener('blur', this.onBlur);

        this.interval = setInterval(this.checkInactivity, this.checkInterval);
    }

    /**
     * Set active
     */
    setActive(active: boolean) {
        active = active ? true : false;

        if (active) {
            this.lastActivity = new Date().getTime();
        }

        if (this.active !== active) {
            this.active = active;
            this.client.addEvent('activity', this.active);

            if (this.active) {
                this.interval = setInterval(this.checkInactivity, this.checkInterval);
            } else {
                clearInterval(this.interval);
            }
        }
    }

    /**
     * Set focused
     */
    setFocused(focused: boolean) {
        if (this.focused !== focused) {
            this.focused = focused;
        }
    }

    /**
     * On focus
     */
    onFocus(event: any) {
        this.setFocused(true);
        this.setActive(true);
    }

    /**
     * On blur
     */
    onBlur(event: any) {
        this.setFocused(false);
    }

    /**
     * Is active?
     */
    isActive(): boolean {
        return this.active;
    }

    /**
     * Is focused?
     */
    isFocused(): boolean {
        return this.focused;
    }

    /**
     * Check inactivity
     */
    checkInactivity() {
        const inactivity = new Date().getTime() - this.lastActivity;

        if (inactivity > this.tolerance) {
            this.setActive(false);
        }
    }
}
