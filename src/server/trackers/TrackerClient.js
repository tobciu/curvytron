import Tracker from './Tracker.js';
import md5 from 'MD5';

/**
 * Client tracker
 */
class ClientTracker extends Tracker {
    constructor(inspector, client) {
        super(inspector, client.id);

        this.client = client;
        this.ip = client.ip;

        this.onLatency = this.onLatency.bind(this);

        this.client.pingLogger.on('latency', this.onLatency);
    }

    /**
     * On latency
     *
     * @param {Number} latency
     */
    onLatency(latency) {
        this.emit('latency', { tracker: this, latency: latency });
    }

    /**
     * @inheritDoc
     */
    getValues() {
        const data = super.getValues();
        data.ip = md5(this.ip);
        return data;
    }
}

export default ClientTracker;
