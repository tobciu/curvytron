import { metrics } from '../service/Metrics.ts';
import { PingLogger } from './PingLogger.ts';
import { Collection } from '../../shared/Collection.ts';
import type { ClientData, ServerEvents } from '../../shared/protocol.ts';
import { BaseSocketClient } from '../../shared/core/BaseSocketClient.ts';
import { BaseTickrateLogger } from '../../shared/service/BaseTickrateLogger.ts';

/**
 * Socket Client
 */
/**
 * Events a client may send: `burst` at once, then `rate` per second.
 * The game itself sends a few per second (steering, chat, ready), this is far above it.
 */
export const eventLimit = { burst: 120, rate: 60, violationsToClose: 300 };

export class SocketClient extends BaseSocketClient<ServerEvents> {
    /** Events that can still be sent, refilled with time */
    tokens: number = eventLimit.burst;
    tokensUpdated: number = Date.now();
    /** Events dropped since the last time the client sent in the limits */
    violations: number = 0;

    ip: any;
    override id: any;
    active: any;
    players: Collection;
    pingLogger: PingLogger;
    tickrate: any;

    /** Secret of the browser, to find this client again after a reload or a lost connection */
    token: string | null = null;
    /** Tab of the browser: two tabs of a browser are two clients, a reload of a tab is the same client */
    tab: string | null = null;
    /** Did the connection come back? The next `room:join` brings the client back to its room */
    resuming: boolean = false;
    /**
     * The client does not take part in its game for now: its connection dropped, or its page is not the game yet.
     * Its players stay in the game until it ends.
     */
    away: boolean = false;
    /** Closed for good */
    closed: boolean = false;
    /** Asked when the connection drops: should the client wait for its return (the room sets it)? */
    canSuspend: (() => boolean) | null = null;

    /**
     * Ping interval
     */
    pingInterval: number = 1000;

    constructor(socket: any, interval: any, ip: any) {
        super(socket, interval);

        this.ip = ip;
        this.id = null;
        this.active = true;
        this.players = new Collection([], 'id');
        this.pingLogger = new PingLogger(this.socket);
        this.tickrate = new BaseTickrateLogger();

        this.identify = this.identify.bind(this);
        this.onActivity = this.onActivity.bind(this);
        this.onLatency = this.onLatency.bind(this);

        this.on('whoami', this.identify);
        this.on('activity', this.onActivity);
        this.pingLogger.on('latency', this.onLatency);
    }

    /**
     * Token bucket: the events over the limit are dropped, a client that keeps sending too many is disconnected
     */
    override acceptsEvent(name: unknown): boolean {
        const now = Date.now();

        this.tokens = Math.min(eventLimit.burst, this.tokens + ((now - this.tokensUpdated) / 1000) * eventLimit.rate);
        this.tokensUpdated = now;

        if (this.tokens >= 1) {
            this.tokens--;
            this.violations = Math.max(0, this.violations - 1);

            return true;
        }

        metrics.eventsDropped.inc();

        if (++this.violations > eventLimit.violationsToClose) {
            console.warn('Client %s disconnected: too many events.', this.id);
            this.socket.close(1008, 'Too many events');
        }

        return false;
    }

    /**
     * An event handler failed: count it, the data of the client was most likely wrong
     */
    override onEventError(name: unknown, error: unknown) {
        metrics.eventErrors.inc();
        super.onEventError(name, error);
    }

    /**
     * On ping logger latency value
     */
    onLatency(latency: number) {
        this.addEvent('latency', latency, null, true);
    }

    /**
     * The connection dropped: wait for the return of the client, or close it
     */
    override onClose() {
        if (this.token && this.canSuspend?.()) {
            this.suspend();
        } else {
            super.onClose();
        }
    }

    /**
     * Keep the client without a connection: it holds its place in the game, as an absent player
     */
    suspend() {
        this.connected = false;
        this.stop();
        this.detachEvents();
        this.events.length = 0;
        this.callbacks = {};
        this.setAway(true);
        this.emit('suspend', this);
    }

    /**
     * Give a new connection to the client: it was suspended, or it reloaded the page before the server noticed
     */
    resume(socket: SocketClient['socket'], ip: SocketClient['ip']) {
        if (this.connected) {
            // The old connection is gone for the browser, even when the server does not know yet
            this.detachEvents();
            this.stop();
            this.socket.terminate?.();
        }

        this.socket = socket;
        this.ip = ip;
        this.connected = true;
        this.events.length = 0;
        this.callbacks = {};
        this.resuming = true;
        this.tokens = eventLimit.burst;
        this.tokensUpdated = Date.now();
        this.violations = 0;

        this.attachEvents();
        this.pingLogger.setSocket(socket);
        this.tickrate.start();
        this.start();

        // Back on the page of the game, the client says it is ready (see `GameController.onReady`)
        this.setAway(!!this.canSuspend?.());
    }

    /**
     * Close a suspended client for good
     */
    finalize() {
        if (!this.connected && !this.closed) {
            this.closed = true;
            super.onClose();
        }
    }

    /**
     * Set away
     */
    setAway(away: boolean) {
        if (this.away !== away) {
            this.away = away;
            this.emit('presence', this);
        }
    }

    /**
     * Is this client playing?
     */
    isPlaying(): boolean {
        return !this.players.isEmpty();
    }

    /**
     * Clear players
     */
    clearPlayers() {
        this.emit('players:clear', this);
        this.players.clear();
    }

    /**
     * Who am I?
     */
    identify(event: any) {
        event[1](this.id);
    }

    /**
     * On activity change
     */
    onActivity(active: unknown) {
        if (typeof active === 'boolean') {
            this.active = active;
        }
    }

    /**
     * Send an event
     */
    override sendEvents(events: any) {
        this.tickrate.tick(events);
        super.sendEvents(events);
    }

    /**
     * Stop
     */
    override stop() {
        super.stop();
        this.pingLogger.stop();
        this.tickrate.stop();
    }

    /**
     * Object version of the client
     */
    override serialize(): ClientData {
        return { ...super.serialize(), active: this.active };
    }
}
