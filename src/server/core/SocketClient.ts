import type { WebSocket } from 'ws';
import { BaseSocketClient, type SocketLike } from '@shared/core/BaseSocketClient.ts';
import { BaseTickrateLogger } from '@shared/service/BaseTickrateLogger.ts';
import { Collection } from '@shared/Collection.ts';
import { PingLogger } from './PingLogger.ts';

/** Adapts a `ws` WebSocket to the browser-style `SocketLike` that BaseSocketClient wants. */
function wsAdapter(ws: WebSocket): SocketLike {
  const wrapped = new Map<(e: { data?: string }) => void, (...a: unknown[]) => void>();

  return {
    send(data: string) {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    },
    addEventListener(type, listener) {
      const fn =
        type === 'message'
          ? (data: unknown) => listener({ data: String(data) })
          : () => listener({});
      wrapped.set(listener, fn);
      ws.on(type, fn);
    },
    removeEventListener(type, listener) {
      const fn = wrapped.get(listener);
      if (fn) {
        ws.off(type, fn);
        wrapped.delete(listener);
      }
    },
  };
}

/**
 * One connected client: the batched-protocol socket plus its players, ping
 * logger and tickrate logger. `whoami` / `activity` / `latency` handshake.
 */
export class SocketClient extends BaseSocketClient {
  static readonly pingInterval = 1000;

  ws: WebSocket;
  ip: string;
  active = true;
  players = new Collection<any>([], 'id');
  pingLogger: PingLogger;
  tickrate = new BaseTickrateLogger();

  constructor(ws: WebSocket, interval: number, ip: string) {
    super(wsAdapter(ws), interval);

    this.ws = ws;
    this.ip = ip;
    this.pingLogger = new PingLogger(ws);

    this.identify = this.identify.bind(this);
    this.onActivity = this.onActivity.bind(this);
    this.onLatency = this.onLatency.bind(this);

    this.on('whoami', this.identify);
    this.on('activity', this.onActivity);
    this.pingLogger.on('latency', this.onLatency);
  }

  onLatency(latency: number): void {
    this.addEvent('latency', latency, undefined, true);
  }

  isPlaying(): boolean {
    return !this.players.isEmpty();
  }

  clearPlayers(): void {
    this.emit('players:clear', this);
    this.players.clear();
  }

  /** whoami handler: the framework passes `[data, replyFn]`. */
  identify(event: [unknown, (id: unknown) => void]): void {
    event[1](this.id);
  }

  onActivity(active: boolean): void {
    this.active = active;
  }

  override sendEvents(events: any[]): void {
    this.tickrate.tick(events);
    super.sendEvents(events);
  }

  override stop(): void {
    super.stop();
    this.pingLogger.stop();
    this.tickrate.stop();
  }

  override serialize(): { id: string | number | null; active?: boolean } {
    const data = super.serialize() as { id: string | number | null; active?: boolean };
    data.active = this.active;
    return data;
  }
}
