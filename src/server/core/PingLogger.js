import { EventEmitter } from '#event-emitter';

/**
 * Ping logger
 *
 * @param {Socket} socket
 */
export class PingLogger extends EventEmitter {
    constructor(socket) {
        super();

        this.socket = socket;
        this.interval = null;
        this.pending = null;

        this.ping = this.ping.bind(this);
        this.pong = this.pong.bind(this);

        this.socket.on('pong', this.pong);
    }

    /**
     * Start ping
     */
    start() {
        if (!this.interval) {
            this.interval = setInterval(this.ping, this.frequency);
        }
    }

    /**
     * Stop ping
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Ping
     */
    ping() {
        if (this.pending === null && this.socket.readyState === this.socket.OPEN) {
            this.pending = Date.now();
            this.socket.ping();
        }
    }

    /**
     * Pong
     */
    pong() {
        if (this.pending !== null) {
            const latency = Date.now() - this.pending;

            this.pending = null;
            this.emit('latency', latency);
        }
    }
}

/**
 * Ping frequency in milliseconds
 *
 * @type {Number}
 */
PingLogger.prototype.frequency = 1000;
