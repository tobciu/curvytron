import { md5 } from '../service/hash.ts';
import { Tracker } from './Tracker.ts';

/**
 * Client tracker
 */
export class ClientTracker extends Tracker {
    client: any;
    ip: any;

    constructor(inspector: any, client: any) {
        super(inspector, client.id);

        this.client = client;
        this.ip = client.ip;

        this.onLatency = this.onLatency.bind(this);

        this.client.pingLogger.on('latency', this.onLatency);
    }

    /**
     * On latency
     */
    onLatency(latency: number) {
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
