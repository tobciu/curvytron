import type { ClientData } from '../protocol.ts';
import { EventEmitter } from '#event-emitter';

/**
 * `readyState` of an open WebSocket
 */
const WEBSOCKET_OPEN = 1;

/**
 * Base Socket Client
 */
/**
 * @typeParam Sends The events this side sends, with their data (see `shared/protocol.ts`)
 */
export class BaseSocketClient<Sends extends object = Record<string, any>> extends EventEmitter {
    /** Identifier given by the server */
    id: number | null = null;
    socket: any;
    interval: number;
    events: any[][];
    callbacks: Record<number, (data: any) => void>;
    loop: ReturnType<typeof setInterval> | null;
    connected: boolean;
    callCount: number;

    constructor(socket: any, interval?: number) {
        super();

        this.socket = socket;
        this.interval = typeof interval === 'number' ? interval : 0;
        this.events = [];
        this.callbacks = {};
        this.loop = null;
        this.connected = true;
        this.callCount = 0;

        this.flush = this.flush.bind(this);
        this.onMessage = this.onMessage.bind(this);
        this.onClose = this.onClose.bind(this);

        this.attachEvents();
        this.start();
    }

    /**
     * On socket close
     */
    onClose() {
        this.connected = false;
        this.emit('close', this);
        this.stop();
        this.detachEvents();
    }

    /**
     * Set interval
     */
    setInterval(interval?: number) {
        this.stop();
        this.flush();

        this.interval = typeof interval === 'number' ? interval : 0;

        this.start();
    }

    /**
     * Start
     */
    start() {
        if (this.interval && !this.loop) {
            this.loop = setInterval(this.flush, this.interval);
            this.flush();
        }
    }

    /**
     * Stop
     */
    stop() {
        if (this.loop) {
            clearInterval(this.loop);
            this.loop = null;
        }
    }

    /**
     * Attach events
     */
    attachEvents() {
        this.socket.addEventListener('message', this.onMessage);
        this.socket.addEventListener('close', this.onClose);
    }

    /**
     * Detach Events
     */
    detachEvents() {
        this.socket.removeEventListener('message', this.onMessage);
        this.socket.removeEventListener('close', this.onClose);
    }

    /**
     * Add an event to the list
     */
    addEvent<K extends keyof Sends & string>(
        name: K,
        data?: Sends[K],
        callback?: ((...args: any[]) => any) | null,
        force?: boolean
    ) {
        const event: any[] = [name];

        if (data !== undefined) {
            event[1] = data;
        }

        if (typeof callback === 'function') {
            event[2] = this.indexCallback(callback);
        }

        if (!this.interval || (force !== undefined && force)) {
            this.sendEvents([event]);
        } else {
            this.events.push(event);
            this.start();
        }
    }

    /**
     * Add an event to the list
     */
    addEvents(sources: any, force?: boolean) {
        const length = sources.length,
            events: any[][] = [];

        for (let i = 0; i < length; i++) {
            events.push(sources[i]);
        }

        if (!this.interval || force) {
            this.sendEvents(events);
        } else {
            Array.prototype.push.apply(this.events, events);
            this.start();
        }
    }

    /**
     * Index a new callback
     */
    indexCallback(callback: (...args: any[]) => any): number {
        const index = this.callCount++;

        this.callbacks[index] = callback;

        return index;
    }

    /**
     * Add a callback
     */
    addCallback(id: number, data?: any) {
        const event: any[] = [id];

        if (data !== undefined) {
            event[1] = data;
        }

        this.sendEvents([event]);
    }

    /**
     * Send an event
     */
    sendEvents(events: any) {
        if (this.socket.readyState !== WEBSOCKET_OPEN) {
            return;
        }

        this.socket.send(JSON.stringify(events));
    }

    /**
     * Send Events
     */
    flush() {
        if (this.events.length > 0) {
            this.sendEvents(this.events);
            this.events.length = 0;
        }
    }

    /**
     * On message
     */
    onMessage(e: any) {
        let data;

        try {
            data = JSON.parse(e.data);
        } catch {
            return;
        }

        if (!Array.isArray(data)) {
            return;
        }

        for (const source of data) {
            if (!Array.isArray(source)) {
                continue;
            }

            const name = source[0];

            if (!this.acceptsEvent(name)) {
                continue;
            }

            // A bad event must not stop the others, nor the process
            try {
                this.handleEventSource(name, source);
            } catch (error) {
                this.onEventError(name, error);
            }
        }
    }

    /**
     * Emit one event source, either a named event or an indexed callback answer
     */
    handleEventSource(name: string | number, source: unknown[]): void {
        if (typeof name === 'string') {
            if (source.length === 3) {
                this.emit(name, [source[1], this.createCallback(source[2] as number)]);
            } else {
                this.emit(name, source[1]);
            }
        } else if (typeof name === 'number') {
            this.playCallback(name, source[1] ?? null);
        }
    }

    /**
     * Should this event be handled? The server drops the events of the clients that send too many.
     */
    acceptsEvent(name: unknown): boolean {
        return true;
    }

    /**
     * An event handler failed, most likely because of unexpected data
     */
    onEventError(name: unknown, error: unknown) {
        console.error(
            'Error while handling the event "%s" of client %s:',
            String(name),
            this.id,
            error instanceof Error ? error.message : error
        );
    }

    /**
     * Play an indexed callback
     */
    playCallback(id: number, data: any) {
        if (this.callbacks[id] !== undefined) {
            this.callbacks[id](data);
            delete this.callbacks[id];
        }
    }

    /**
     * Create callback
     */
    createCallback(id: number) {
        return (data?: any) => {
            this.addCallback(id, data);
        };
    }

    /**
     * Object version of the client
     */
    serialize(): ClientData {
        return { id: this.id };
    }
}
