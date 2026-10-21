export type Listener = (event: any) => void;

/**
 * Event emitter.
 *
 * Listeners receive a DOM-like event: `{ type, detail }`. On the server `#event-emitter`
 * resolves to the plain Node.js emitter instead, where listeners receive the payload itself.
 * The types of this file describe both: code shared by client and server only uses what they have in common.
 */
export class EventEmitter {
    _events: Record<string, Listener[]> = {};

    /**
     * Emit a new event
     */
    emit(name: string, data?: unknown): void {
        const callbacks = this._events[name];

        if (!callbacks) {
            return;
        }

        const event = { type: name, detail: data };

        // Copy: listeners may unsubscribe while the event is emitted
        const current = callbacks.slice();

        for (const callback of current) {
            callback(event);
        }
    }

    /**
     * Add a listener
     */
    addEventListener(name: string, callback: Listener): void {
        const callbacks = (this._events[name] ??= []);

        if (!callbacks.includes(callback)) {
            callbacks.push(callback);
        }
    }

    /**
     * Remove a listener
     */
    removeEventListener(name: string, callback: Listener): void {
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

    on(name: string, callback: Listener): void {
        this.addEventListener(name, callback);
    }

    off(name: string, callback: Listener): void {
        this.removeEventListener(name, callback);
    }

    /** Alias of `off`, as in Node.js */
    removeListener(name: string, callback: Listener): void {
        this.removeEventListener(name, callback);
    }
}
