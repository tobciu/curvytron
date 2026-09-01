import { EventEmitter } from 'eventemitter3';

/**
 * Minimal socket surface `BaseSocketClient` needs. The browser's native `WebSocket`
 * satisfies it directly; on the server the `ws` socket is wrapped to provide
 * `addEventListener` / `removeEventListener` (see `server/core/SocketClient`).
 */
export interface SocketLike {
  send(data: string): void;
  addEventListener(type: 'message' | 'close', listener: (event: { data?: string }) => void): void;
  removeEventListener(type: 'message' | 'close', listener: (event: { data?: string }) => void): void;
}

/** One outgoing entry: `[name, data?, callbackId?]`, or a reply `[callbackId, data?]`. */
type WireEntry = [string | number, unknown?, number?];

/**
 * The Curvytron wire protocol: events are queued and flushed as
 * `JSON.stringify([[name, data, callbackId?], ...])` on an interval; a numeric first
 * element is an RPC callback reply. Shared verbatim by client and server.
 */
export class BaseSocketClient extends EventEmitter {
  socket: SocketLike;
  interval: number;
  events: WireEntry[] = [];
  callbacks: Record<number, (data: unknown) => void> = {};
  loop: ReturnType<typeof setInterval> | null = null;
  connected = true;
  callCount = 0;
  id: string | number | null = null;

  constructor(socket: SocketLike, interval?: number) {
    super();

    this.socket = socket;
    this.interval = typeof interval === 'number' ? interval : 0;

    this.flush = this.flush.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onClose = this.onClose.bind(this);

    this.attachEvents();
    this.start();
  }

  onClose(): void {
    this.connected = false;
    this.emit('close', this);
    this.stop();
    this.detachEvents();
  }

  setInterval(interval?: number): void {
    this.stop();
    this.flush();
    this.interval = typeof interval === 'number' ? interval : 0;
    this.start();
  }

  start(): void {
    if (this.interval && !this.loop) {
      this.loop = setInterval(this.flush, this.interval);
      this.flush();
    }
  }

  stop(): void {
    if (this.loop) {
      clearInterval(this.loop);
      this.loop = null;
    }
  }

  attachEvents(): void {
    this.socket.addEventListener('message', this.onMessage);
    this.socket.addEventListener('close', this.onClose);
  }

  detachEvents(): void {
    this.socket.removeEventListener('message', this.onMessage);
    this.socket.removeEventListener('close', this.onClose);
  }

  addEvent(name: string, data?: unknown, callback?: (data: unknown) => void, force?: boolean): void {
    const event: WireEntry = [name];

    if (typeof data !== 'undefined') {
      event[1] = data;
    }

    if (typeof callback === 'function') {
      event[2] = this.indexCallback(callback);
    }

    if (!this.interval || force) {
      this.sendEvents([event]);
    } else {
      this.events.push(event);
      this.start();
    }
  }

  addEvents(sources: WireEntry[], force?: boolean): void {
    const events: WireEntry[] = [];

    for (let i = 0; i < sources.length; i++) {
      events.push(sources[i] as WireEntry);
    }

    if (!this.interval || force) {
      this.sendEvents(events);
    } else {
      Array.prototype.push.apply(this.events, events);
      this.start();
    }
  }

  indexCallback(callback: (data: unknown) => void): number {
    const index = this.callCount++;

    this.callbacks[index] = callback;

    return index;
  }

  addCallback(id: number, data?: unknown): void {
    const event: WireEntry = [id];

    if (typeof data !== 'undefined') {
      event[1] = data;
    }

    this.sendEvents([event]);
  }

  sendEvents(events: WireEntry[]): void {
    this.socket.send(JSON.stringify(events));
  }

  flush(): void {
    if (this.events.length > 0) {
      this.sendEvents(this.events);
      this.events.length = 0;
    }
  }

  onMessage(e: { data?: string }): void {
    const data = JSON.parse(e.data ?? '[]') as WireEntry[];

    for (let i = 0; i < data.length; i++) {
      const source = data[i] as WireEntry;
      const name = source[0];

      if (typeof name === 'string') {
        if (source.length === 3) {
          this.emit(name, [source[1], this.createCallback(source[2] as number)]);
        } else {
          this.emit(name, source[1]);
        }
      } else {
        this.playCallback(name, typeof source[1] !== 'undefined' ? source[1] : null);
      }
    }
  }

  playCallback(id: number, data: unknown): void {
    if (typeof this.callbacks[id] !== 'undefined') {
      this.callbacks[id](data);
      delete this.callbacks[id];
    }
  }

  createCallback(id: number): (data?: unknown) => void {
    return (data?: unknown) => {
      this.addCallback(id, data);
    };
  }

  serialize(): { id: string | number | null } {
    return { id: this.id };
  }
}
