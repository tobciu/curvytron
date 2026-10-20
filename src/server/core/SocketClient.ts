import { PingLogger } from './PingLogger.ts';
import { Collection } from '../../shared/Collection.ts';
import { BaseSocketClient } from '../../shared/core/BaseSocketClient.ts';
import { BaseTickrateLogger } from '../../shared/service/BaseTickrateLogger.ts';

/**
 * Socket Client
 */
export class SocketClient extends BaseSocketClient {
    ip: any;
    id: any;
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
    onActivity(active: any) {
        this.active = active;
    }

    /**
     * Send an event
     */
    sendEvents(events: any) {
        this.tickrate.tick(events);
        super.sendEvents(events);
    }

    /**
     * Stop
     */
    stop() {
        super.stop();
        this.pingLogger.stop();
        this.tickrate.stop();
    }

    /**
     * Object version of the client
     */
    serialize() {
        const data = super.serialize();

        data.active = this.active;

        return data;
    }
}
