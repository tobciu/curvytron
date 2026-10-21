import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SocketClient } from '../../src/client/core/SocketClient.ts';

class FakeSocket {
    url: string;
    protocols: string[];
    readyState = 0;
    sent: unknown[] = [];
    listeners: Map<string, ((event: any) => void)[]> = new Map();

    constructor(url: string, protocols: string[]) {
        this.url = url;
        this.protocols = protocols;
    }

    addEventListener(name: string, callback: (event: any) => void) {
        const callbacks = this.listeners.get(name) ?? [];

        callbacks.push(callback);
        this.listeners.set(name, callbacks);
    }

    removeEventListener(name: string, callback: (event: any) => void) {
        const callbacks = this.listeners.get(name) ?? [];
        const index = callbacks.indexOf(callback);

        if (index >= 0) {
            callbacks.splice(index, 1);
        }
    }

    send(data: string) {
        this.sent.push(JSON.parse(data));
    }

    dispatch(name: string, event: Record<string, unknown> = {}) {
        for (const callback of this.listeners.get(name) ?? []) {
            callback({ type: name, ...event });
        }
    }

    open() {
        this.readyState = 1;
        this.dispatch('open');
    }

    message(sources: unknown[]) {
        this.dispatch('message', { data: JSON.stringify(sources) });
    }

    close() {
        this.readyState = 3;
        this.dispatch('close');
    }
}

const realWebSocket = globalThis.WebSocket;
let created: FakeSocket[] = [];

function connect(): { client: SocketClient; socket: FakeSocket } {
    const client = new SocketClient();
    const socket = created.at(-1) as FakeSocket;

    socket.open();
    socket.message([[0, 42]]);

    return { client, socket };
}

beforeEach(() => {
    created = [];

    globalThis.WebSocket = function (url: string, protocols: string[]) {
        const socket = new FakeSocket(url, protocols);

        created.push(socket);

        return socket;
    } as unknown as typeof WebSocket;

    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    globalThis.WebSocket = realWebSocket;
    vi.restoreAllMocks();
});

describe('SocketClient', () => {
    it('connects to the page host over a websocket, and is offline until the server answers', () => {
        const client = new SocketClient();
        const socket = created[0];

        expect(socket.url).toMatch(/^ws:\/\//);
        expect(socket.protocols).toEqual(['websocket']);
        expect(client.id).toBeNull();
        expect(client.connected).toBe(false);
    });

    it('asks whoami as soon as the socket opens', () => {
        new SocketClient();
        const socket = created[0];

        socket.open();

        expect(socket.sent).toEqual([
            [
                ['whoami', null, 0] // 0: the index of the onConnection callback
            ]
        ]);
    });

    it('is connected with its server id once whoami answers, and announces it', () => {
        const client = new SocketClient();
        const socket = created[0];
        const connected = vi.fn();

        client.on('connected', connected);
        socket.open();
        socket.message([[0, 42]]);

        expect(client.id).toBe(42);
        expect(client.connected).toBe(true);
        expect(connected).toHaveBeenCalledTimes(1);
        expect(client.serialize()).toEqual({ id: 42 });
    });

    it('sends typed events and routes the server answer to the callback', () => {
        const { client, socket } = connect();
        const reply = vi.fn();

        client.addEvent('room:talk', 'hello', reply);

        expect(socket.sent.at(-1)).toEqual([['room:talk', 'hello', 1]]);

        socket.message([[1, 'ok']]);

        expect(reply).toHaveBeenCalledWith('ok');
    });

    it('disconnected after the socket closes, forgetting its id', () => {
        const { client, socket } = connect();
        const disconnected = vi.fn();

        client.on('disconnected', disconnected);
        socket.close();

        expect(client.connected).toBe(false);
        expect(client.id).toBeNull();
        expect(disconnected).toHaveBeenCalled();
    });

    it('treats an error while offline as a disconnection', () => {
        const client = new SocketClient();
        const socket = created[0];
        const disconnected = vi.fn();
        const error = new Error('boom');

        client.on('disconnected', disconnected);
        socket.dispatch('error', { error });

        expect(console.error).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', error }));
        expect(client.connected).toBe(false);
        expect(disconnected).toHaveBeenCalled();
    });

    it('keeps the connection on an error once connected', () => {
        const { client, socket } = connect();
        const disconnected = vi.fn();

        client.on('disconnected', disconnected);
        socket.dispatch('error', { error: new Error('blip') });

        expect(console.error).toHaveBeenCalled();
        expect(client.connected).toBe(true);
        expect(disconnected).not.toHaveBeenCalled();
    });

    it('does not send events queued before the socket is open', () => {
        const client = new SocketClient();
        const socket = created[0];

        client.addEvent('whoami', undefined, null, true);

        expect(socket.sent).toEqual([]);

        socket.open();

        expect(socket.sent).toEqual([
            [
                ['whoami', null, 0] // the one queued by onOpen
            ]
        ]);
    });
});
