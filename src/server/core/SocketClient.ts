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
