import { EventEmitter } from '#event-emitter';

/**
 * Ping logger
 */
export class PingLogger extends EventEmitter {
    socket: any;
    interval: any;
    pending: any;

    /**
     * Ping frequency in milliseconds
     */
    frequency: number = 1000;

    constructor(socket: any) {
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
