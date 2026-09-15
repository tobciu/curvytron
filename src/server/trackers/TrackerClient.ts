import { Tracker, type TrackerValues } from './Tracker.ts';
import { md5 } from './md5.ts';
import type { SocketClient } from '../core/SocketClient.ts';

/** Tracks one connected client: latency samples + a hashed IP. */
export class TrackerClient extends Tracker {
  client: SocketClient;
  ip: string;

  constructor(client: SocketClient) {
    super(String(client.id));
    this.client = client;
    this.ip = client.ip;

    this.onLatency = this.onLatency.bind(this);
    this.client.pingLogger.on('latency', this.onLatency);
  }

  onLatency(latency: number): void {
    this.emit('latency', { tracker: this, latency });
  }

  override getValues(): TrackerValues {
    return { ...super.getValues(), ip: md5(this.ip) };
  }
}
