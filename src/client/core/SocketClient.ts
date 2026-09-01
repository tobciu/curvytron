import { BaseSocketClient, type SocketLike } from '@shared/core/BaseSocketClient.ts';

/** Browser socket client: opens a WebSocket, does the `whoami` handshake. */
export class SocketClient extends BaseSocketClient {
  connected = false;
  private readonly ws: WebSocket;

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

  static defaultUrl(): string {
    const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
    return protocol + location.host + location.pathname;
  }

  private onOpen(): void {
    console.info('Socket open.');
    this.addEvent('whoami', null, (id) => this.onConnection(id));
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
