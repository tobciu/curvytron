import EventEmitter from 'tom32i-event-emitter.js';

/**
 * Ping logger
 */
class PingLogger extends EventEmitter {
    /**
     * Ping frequency in milliseconds
     *
     * @type {Number}
     */
    frequency = 1000;

    constructor(socket) {
        super();

        this.socket = socket;
        this.interval = null;

        this.ping = this.ping.bind(this);
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
        const ping = new Date().getTime();
        this.socket.ping(null, () => this.pong(ping));
    }

    /**
     * Pong
     *
     * @param {Number} ping
     */
    pong(ping) {
        this.emit('latency', new Date().getTime() - ping);
    }
}

export default PingLogger;
