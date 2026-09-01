import { EventEmitter } from 'eventemitter3';
import type { WebSocket } from 'ws';

/** Measures round-trip latency by sending a WS ping every second. */
export class PingLogger extends EventEmitter {
  static readonly frequency = 1000;

  private socket: WebSocket;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(socket: WebSocket) {
    super();
    this.socket = socket;
    this.ping = this.ping.bind(this);
  }

  start(): void {
    if (!this.interval) {
      this.interval = setInterval(this.ping, PingLogger.frequency);
    }
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  ping(): void {
    if (this.socket.readyState !== this.socket.OPEN) {
      return;
    }
    const sent = Date.now();
    this.socket.once('pong', () => this.pong(sent));
    try {
      this.socket.ping();
    } catch {
      /* socket closing */
    }
  }

  pong(sent: number): void {
    this.emit('latency', Date.now() - sent);
  }
}
