import { WebSocket } from 'ws';

type Waiter = (name: string, data: any) => boolean;

/**
 * Minimal client of the Curvytron socket protocol:
 * a message is a list of events `[name, data?, callbackId?]`, a reply is `[callbackId, data]`.
 */
export class TestClient {
    /**
     * @param session What a browser sends to be recognized again after a lost connection or a reload
     */
    static connect(port: number | string, session?: { token: string; tab: string }): Promise<TestClient> {
        return new Promise((resolve, reject) => {
            const query = session ? `?token=${session.token}&tab=${session.tab}` : '';
            const client = new TestClient(new WebSocket(`ws://localhost:${port}/${query}`, ['websocket']));

            client.socket.once('open', () => resolve(client));
            client.socket.once('error', reject);
        });
    }

    socket: WebSocket;
    callbacks: Map<number, (data: any) => void> = new Map();
    waiting: Waiter[] = [];
    events: Array<[string, any]> = [];
    counter = 0;

    constructor(socket: WebSocket) {
        this.socket = socket;

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
    request(name: string, data: unknown = null): Promise<any> {
        return new Promise((resolve) => {
            const id = this.counter++;

            this.callbacks.set(id, resolve);
            this.socket.send(JSON.stringify([[name, data, id]]));
        });
    }

    /**
     * Send an event, no answer expected
     */
    send(name: string, data?: unknown) {
        this.socket.send(JSON.stringify([[name, data]]));
    }

    /**
     * Wait for the next event with the given name (and matching the optional predicate)
     */
    waitFor(name: string, matches: (data: any) => boolean = () => true, timeout = 5000): Promise<any> {
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
