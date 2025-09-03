/**
 * Notifier
 */
class Notifier {
    constructor(sound, watcher) {
        this.sound = sound;
        this.watcher = watcher;
        this.element = document.getElementsByTagName('title')[0];
        this.title = this.element.text;
        this.timeout = null;

        this.clear = this.clear.bind(this);
    }

    /**
     * Default message duration
     *
     * @type {Number}
     */
    duration = 5000;

    /**
     * Notify
     *
     * @param {String} message
     * @param {Number} duration
     * @param {String} sound
     */
    notify(message, duration, sound) {
        if (!this.watcher.isActive() || !this.watcher.isFocused()) {
            this.display(message, duration);
        }

        this.sound.play(typeof(sound) === 'string' ? sound : 'notice');
    }
    /**
     * Notify inactive
     *
     * @param {String} message
     * @param {Number} duration
     * @param {String} sound
     */
    notifyInactive(message, duration, sound) {
        if (!this.watcher.isActive() || !this.watcher.isFocused()) {
            this.display(message, duration);
            this.sound.play(typeof(sound) === 'string' ? sound : 'notice');
        }
    }

    /**
     * Set message
     *
     * @param {String} message
     * @param {Number} duration
     */
    display(message, duration) {
        this.clearTimeout();
        this.write(message);
        setTimeout(this.clear, typeof(duration) === 'number' ? duration : this.duration);
    }

    /**
     * Write a message in the title
     *
     * @param {String} message
     */
    write(message) {
        this.element.text = message + ' - ' + this.title;
    }

    /**
     * Clear the title
     */
    clear() {
        this.clearTimeout();
        this.element.text = this.title;
    }

    /**
     * Clear timeout
     */
    clearTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
    }
}

export default Notifier;
