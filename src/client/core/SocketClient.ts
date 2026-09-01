import { BaseSocketClient, type SocketLike } from '@shared/core/BaseSocketClient.ts';

/** Browser socket client: opens a WebSocket, buffers sends until OPEN, does the `whoami` handshake. */
export class SocketClient extends BaseSocketClient {
  connected = false;
  private readonly ws: WebSocket;
  private pending: unknown[][] = [];

  constructor(url?: string) {
    const ws = new WebSocket(url ?? SocketClient.defaultUrl(), ['websocket']);
    // A native WebSocket satisfies SocketLike at runtime (send / add/removeEventListener,
    // MessageEvent.data). TS just can't line up the event types.
    super(ws as unknown as SocketLike);
    this.ws = ws;

    this.ws.addEventListener('open', () => this.onOpen());
    this.ws.addEventListener('error', (e) => this.onError(e));
    this.ws.addEventListener('close', () => this.onCloseLocal());
  }

  /** Hold frames until the socket is OPEN, then flush them in order. */
  override sendEvents(events: unknown[][]): void {
    if (this.ws.readyState === this.ws.OPEN) {
      super.sendEvents(events as never);
    } else {
      this.pending.push(...events);
    }
  }

  static defaultUrl(): string {
    const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
    return protocol + location.host + location.pathname;
  }

  private onOpen(): void {
    console.info('Socket open.');
    // whoami first, then replay anything the app queued before OPEN.
    this.addEvent('whoami', null, (id) => this.onConnection(id));
    if (this.pending.length) {
      const queued = this.pending;
      this.pending = [];
      super.sendEvents(queued as never);
    }
  }

  private onConnection(id: unknown): void {
    console.info('Connected with id "%s".', id);
    this.id = id as string | number;
    this.connected = true;
    this.start();
    this.emit('connected');
  }

  private onCloseLocal(): void {
    console.info('Disconnected.');
    this.connected = false;
    this.id = null;
    this.stop();
    this.emit('disconnected');
  }

  private onError(e: Event): void {
    console.error(e);
    if (!this.connected) {
      this.onCloseLocal();
    }
  }
}
