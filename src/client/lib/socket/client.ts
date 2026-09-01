import { writable, type Readable } from 'svelte/store';
import { SocketClient } from '../../core/SocketClient.ts';
import type { ClientToServer, ServerToClient, RpcReply } from './events.ts';

type Handler<K extends keyof ServerToClient> = (data: ServerToClient[K]) => void;

/**
 * The app's single socket. Thin, typed wrapper over the shared `SocketClient`:
 * a `connected` store, typed `on`/`off`, and a promise-based `request()` over
 * the positional-callback mechanism.
 */
class Socket {
  private client: SocketClient | null = null;
  private readonly _connected = writable(false);
  private readonly _clientId = writable<string | number | null>(null);

  readonly connected: Readable<boolean> = { subscribe: this._connected.subscribe };
  readonly clientId: Readable<string | number | null> = { subscribe: this._clientId.subscribe };

  connect(url?: string): void {
    if (this.client) {
      return;
    }
    const client = new SocketClient(url);
    this.client = client;

    client.on('connected', () => {
      this._connected.set(true);
      this._clientId.set(client.id);
    });
    client.on('disconnected', () => {
      this._connected.set(false);
      this._clientId.set(null);
    });
  }

  private require(): SocketClient {
    if (!this.client) {
      throw new Error('Socket not connected — call socket.connect() first');
    }
    return this.client;
  }

  on<K extends keyof ServerToClient>(event: K, handler: Handler<K>): void {
    this.require().on(event, handler as (data: unknown) => void);
  }

  off<K extends keyof ServerToClient>(event: K, handler: Handler<K>): void {
    this.require().off(event, handler as (data: unknown) => void);
  }

  /** Fire-and-forget (no reply expected). */
  emit<K extends keyof ClientToServer>(event: K, data?: ClientToServer[K]): void {
    this.require().addEvent(event, data);
  }

  /** Send and await the RPC reply. */
  request<R extends RpcReply = RpcReply, K extends keyof ClientToServer = keyof ClientToServer>(
    event: K,
    data?: ClientToServer[K],
  ): Promise<R> {
    return new Promise((resolve) => {
      this.require().addEvent(event, data, (reply) => resolve(reply as R));
    });
  }
}

export const socket = new Socket();
