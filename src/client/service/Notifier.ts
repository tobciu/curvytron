/**
 * Notifier
 */
export class Notifier {
    sound: any;
    watcher: any;
    element: any;
    title: any;
    timeout: any;

    /**
     * Default message duration
     */
    duration: number = 5000;

    constructor(sound: any, watcher: any) {
        this.sound = sound;
        this.watcher = watcher;
        this.element = document.getElementsByTagName('title')[0];
        this.title = this.element.text;
        this.timeout = null;

        this.clear = this.clear.bind(this);
    }

    /**
     * Notify
     */
    notify(message: string, duration?: number | null, sound?: string) {
        if (!this.watcher.isActive() || !this.watcher.isFocused()) {
            this.display(message, duration);
        }

        this.sound.play(typeof sound === 'string' ? sound : 'notice');
    }

    /**
     * Notify inactive
     */
    notifyInactive(message: string, duration?: number | null, sound?: string) {
        if (!this.watcher.isActive() || !this.watcher.isFocused()) {
            this.display(message, duration);
            this.sound.play(typeof sound === 'string' ? sound : 'notice');
        }
    }

    /**
     * Set message
     */
    display(message: string, duration?: number | null) {
        this.clearTimeout();
        this.write(message);
        setTimeout(this.clear, typeof duration === 'number' ? duration : this.duration);
    }

    /**
     * Write a message in the title
     */
    write(message: string) {
        this.element.text = `${message} - ${this.title}`;
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
