/**
 * Activity watcher
 */
class ActivityWatcher {
    constructor(client) {
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
     * Tolerated time away from keyboard
     *
     * @type {Number}
     */
    tolerance = 60000;

    /**
     * Activity check interval
     *
     * @type {Number}
     */
    checkInterval = 10000;

    /**
     * Set active
     *
     * @param {Boolean} active
     */
    setActive(active) {
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
     *
     * @param {Boolean} focused
     */
    setFocused(focused) {
        if (this.focused !== focused) {
            this.focused = focused;
        }
    }

    /**
     * On focus
     *
     * @param {Event} event
     */
    onFocus(event) {
        this.setFocused(true);
        this.setActive(true);
    }

    /**
     * On blur
     *
     * @param {Event} event
     */
    onBlur(event) {
        this.setFocused(false);
    }

    /**
     * Is active?
     *
     * @return {Boolean}
     */
    isActive() {
        return this.active;
    }

    /**
     * Is focused?
     *
     * @return {Boolean}
     */
    isFocused() {
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

export default ActivityWatcher;
