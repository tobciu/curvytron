import { WebSocket } from 'ws';

/**
 * Minimal client of the Curvytron socket protocol:
 * a message is a list of events `[name, data?, callbackId?]`, a reply is `[callbackId, data]`.
 */
export class TestClient {
    static connect(port) {
        return new Promise((resolve, reject) => {
            const client = new TestClient(new WebSocket(`ws://localhost:${port}/`, ['websocket']));

            client.socket.once('open', () => resolve(client));
            client.socket.once('error', reject);
        });
    }

    constructor(socket) {
        this.socket = socket;
        this.callbacks = new Map();
        this.waiting = [];
        this.events = [];
        this.counter = 0;

        socket.on('message', (message) => {
            for (const [name, data] of JSON.parse(message.toString())) {
                if (typeof name === 'number') {
                    this.callbacks.get(name)?.(data);
                    this.callbacks.delete(name);
                } else {
                    this.events.push([name, data]);
                    this.waiting = this.waiting.filter((waiter) => !waiter(name, data));
                }
            }
        });
    }

    /**
     * Send an event and wait for the server's answer
     */
    request(name, data = null) {
        return new Promise((resolve) => {
            const id = this.counter++;

            this.callbacks.set(id, resolve);
            this.socket.send(JSON.stringify([[name, data, id]]));
        });
    }

    /**
     * Send an event, no answer expected
     */
    send(name, data) {
        this.socket.send(JSON.stringify([[name, data]]));
    }

    /**
     * Wait for the next event with the given name (and matching the optional predicate)
     */
    waitFor(name, matches = () => true, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${name}"`)), timeout);

            this.waiting.push((eventName, data) => {
                if (eventName !== name || !matches(data)) {
                    return false;
                }

                clearTimeout(timer);
                resolve(data);

                return true;
            });
        });
    }

    close() {
        this.socket.close();
    }
}
