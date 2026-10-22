import type { ClientEventName, ClientEvents } from '../../shared/protocol.ts';
import { BaseSocketClient } from '../../shared/core/BaseSocketClient.ts';
import { getSession } from './session.ts';

/**
 * SocketClient
 */
/** The data of the events the client sends */
type Sent = { [K in ClientEventName]: ClientEvents[K]['data'] };

export class SocketClient extends BaseSocketClient<Sent> {
    override id: any;
    override connected: boolean;
    /** Was the client connected once? A connection after that is a reconnection */
    wasConnected: boolean = false;
    /** Waits to open a new socket after a lost connection */
    retry: ReturnType<typeof setTimeout> | null = null;
    retries: number = 0;
    /** Asks the server now and then if it is still there: a connection can be lost without a word */
    heartbeat: ReturnType<typeof setInterval> | null = null;
    heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;

    /** Delays (ms) between the attempts to reconnect, the last one is kept */
    static retryDelays: number[] = [500, 1000, 2000, 3000, 5000];

    /** Delay (ms) between two heartbeats, and time the server has to answer */
    static heartbeatInterval: number = 10000;
    static heartbeatWait: number = 8000;

    constructor() {
        super(SocketClient.openSocket(), undefined);

        this.id = null;
        this.connected = false;

        this.onError = this.onError.bind(this);
        this.onOpen = this.onOpen.bind(this);
        this.onConnection = this.onConnection.bind(this);
        this.onHeartbeat = this.onHeartbeat.bind(this);
        this.reconnect = this.reconnect.bind(this);

        this.attachSocketEvents();

        // The network is back: do not wait for the next attempt
        globalThis.addEventListener?.('online', this.reconnect);
    }

    /**
     * Open a socket to the server, with what it needs to recognize this page
     */
    static openSocket(): WebSocket {
        const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
        const { token, tab } = getSession();
        const query = `?token=${encodeURIComponent(token)}&tab=${encodeURIComponent(tab)}`;

        return new WebSocket(protocol + document.location.host + document.location.pathname + query, ['websocket']);
    }

    /**
     * Listen to the socket
     */
    attachSocketEvents() {
        this.socket.addEventListener('open', this.onOpen);
        this.socket.addEventListener('error', this.onError);
        this.socket.addEventListener('close', this.onClose);
    }

    /**
     * Stop listening to the socket
     */
    detachSocketEvents() {
        this.detachEvents();
        this.socket.removeEventListener('open', this.onOpen);
        this.socket.removeEventListener('error', this.onError);
        this.socket.removeEventListener('close', this.onClose);
    }

    /**
     * Open a new socket, after a lost connection
     */
    reconnect() {
        if (this.connected || this.socket.readyState === 0) {
            return;
        }

        if (this.retry) {
            clearTimeout(this.retry);
            this.retry = null;
        }

        this.detachSocketEvents();
        this.socket.close();
        this.socket = SocketClient.openSocket();
        this.events.length = 0;
        this.callbacks = {};
        this.attachEvents();
        this.attachSocketEvents();
    }

    /**
     * Try again in a moment
     */
    scheduleRetry() {
        if (this.retry) {
            return;
        }

        const delays = SocketClient.retryDelays;
        const delay = delays[Math.min(this.retries, delays.length - 1)];

        this.retries++;
        this.retry = setTimeout(() => {
            this.retry = null;
            this.reconnect();
        }, delay);
    }

    /**
     * Ask the server if it is there, and give up on the connection if it does not answer
     */
    onHeartbeat() {
        if (!this.connected || this.heartbeatTimeout) {
            return;
        }

        this.heartbeatTimeout = setTimeout(() => {
            this.heartbeatTimeout = null;
            console.warn('The server does not answer.');
            this.socket.close();
        }, SocketClient.heartbeatWait);

        this.addEvent('whoami', undefined, () => {
            if (this.heartbeatTimeout) {
                clearTimeout(this.heartbeatTimeout);
                this.heartbeatTimeout = null;
            }
        });
    }

    /**
     * Stop the heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeat) {
            clearInterval(this.heartbeat);
            this.heartbeat = null;
        }

        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }

    /**
     * On socket connection
     */
    onOpen(e: any) {
        console.info('Socket open.');
        this.addEvent('whoami', undefined, this.onConnection);
    }

    /**
     * Send an event; the answer of the server, if there is one, goes to the callback
     */
    override addEvent<K extends ClientEventName>(
        name: K,
        data?: ClientEvents[K]['data'],
        callback?: ((reply: ClientEvents[K]['reply']) => void) | null,
        force?: boolean
    ) {
        super.addEvent(name, data as Sent[K], callback, force);
    }

    /**
     * On open
     */
    onConnection(id: any) {
        console.info('Connected with id "%s".', id);

        const reconnected = this.wasConnected;

        this.id = id;
        this.connected = true;
        this.wasConnected = true;
        this.retries = 0;

        this.start();
        this.heartbeat ??= setInterval(this.onHeartbeat, SocketClient.heartbeatInterval);
        this.emit('connected');

        if (reconnected) {
            // What the page knows is out of date: the app starts again from the server
            this.emit('reconnected');
        }
    }

    /**
     * On open
     */
    override onClose() {
        console.info('Disconnected.');

        this.connected = false;
        this.id = null;

        this.stop();
        this.stopHeartbeat();

        this.emit('disconnected');
        this.scheduleRetry();
    }

    /**
     * On error
     */
    onError(e: unknown) {
        console.error(e);

        if (!this.connected) {
            this.onClose();
        }
    }
}
