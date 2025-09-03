import BaseSocketClient from '../../shared/core/BaseSocketClient.js';
import Collection from '../../shared/Collection.js';
import PingLogger from './PingLogger.js';
import BaseTickrateLogger from '../../shared/service/BaseTickrateLogger.js';

/**
 * Socket Client
 */
class SocketClient extends BaseSocketClient {
    /**
     * Ping interval
     *
     * @type {Number}
     */
    pingInterval = 1000;

    constructor(socket, interval, ip) {
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
     *
     * @param {Number} latency
     */
    onLatency(latency) {
        this.addEvent('latency', latency, null, true);
    }

    /**
     * Is this client playing?
     *
     * @return {Boolean}
     */
    isPlaying() {
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
    identify(event) {
        event[1](this.id);
    }

    /**
     * On activity change
     *
     * @param {Event} event
     */
    onActivity(active) {
        this.active = active;
    }

    /**
     * Send an event
     *
     * @param {String} name
     * @param {String} data
     */
    sendEvents(events) {
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
     *
     * @return {Object}
     */
    serialize() {
        const data = super.serialize();
        data.active = this.active;
        return data;
    }
}

export default SocketClient;
