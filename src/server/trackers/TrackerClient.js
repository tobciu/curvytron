import { md5 } from '../service/hash.js';
import { Tracker } from './Tracker.js';

/**
 * Client tracker
 *
 * @param {Inspector} inspector
 * @param {Client} client
 */
export class ClientTracker extends Tracker {
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
        this.emit('latency', { tracker: this, latency });
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
