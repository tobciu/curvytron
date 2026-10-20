/**
 * Event emitter.
 *
 * Listeners receive a DOM-like event: `{ type, detail }`. On the server `#event-emitter`
 * resolves to the plain Node.js emitter instead, where listeners receive the payload itself.
 */
export class EventEmitter {
    constructor() {
        this._events = {};
    }

    /**
     * Emit a new event
     *
     * @param {String} name
     * @param {*} data
     */
    emit(name, data) {
        const callbacks = this._events[name];

        if (!callbacks) {
            return;
        }

        const event = { type: name, detail: data };

        for (const callback of [...callbacks]) {
            callback(event);
        }
    }

    /**
     * Add a listener
     *
     * @param {String} name
     * @param {Function} callback
     */
    addEventListener(name, callback) {
        const callbacks = (this._events[name] ??= []);

        if (!callbacks.includes(callback)) {
            callbacks.push(callback);
        }
    }

    /**
     * Remove a listener
     *
     * @param {String} name
     * @param {Function} callback
     */
    removeEventListener(name, callback) {
        const callbacks = this._events[name];

        if (!callbacks) {
            return;
        }

        const index = callbacks.indexOf(callback);

        if (index >= 0) {
            callbacks.splice(index, 1);
        }

        if (!callbacks.length) {
            delete this._events[name];
        }
    }

    on(name, callback) {
        this.addEventListener(name, callback);
    }

    off(name, callback) {
        this.removeEventListener(name, callback);
    }
}
