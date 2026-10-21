import type { ClientEventName, ClientEvents } from '../../shared/protocol.ts';
import { BaseSocketClient } from '../../shared/core/BaseSocketClient.ts';

/**
 * SocketClient
 */
/** The data of the events the client sends */
type Sent = { [K in ClientEventName]: ClientEvents[K]['data'] };

export class SocketClient extends BaseSocketClient<Sent> {
    override id: any;
    override connected: boolean;

    constructor() {
        const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';

        super(new WebSocket(protocol + document.location.host + document.location.pathname, ['websocket']));

        this.id = null;
        this.connected = false;

        this.onError = this.onError.bind(this);
        this.onOpen = this.onOpen.bind(this);
        this.onConnection = this.onConnection.bind(this);

        this.socket.addEventListener('open', this.onOpen);
        this.socket.addEventListener('error', this.onError);
        this.socket.addEventListener('close', this.onClose);
    }

    /**
     * On socket connection
     */
    onOpen(e: any) {
        console.info('Socket open.');
        this.addEvent('whoami', undefined, this.onConnection);
    }

    /**
     * Send an event; the answer of the server, if there is one, goes to the callback
     */
    override addEvent<K extends ClientEventName>(
        name: K,
        data?: ClientEvents[K]['data'],
        callback?: ((reply: ClientEvents[K]['reply']) => void) | null,
        force?: boolean
    ) {
        super.addEvent(name, data as Sent[K], callback, force);
    }

    /**
     * On open
     */
    onConnection(id: any) {
        console.info('Connected with id "%s".', id);

        this.id = id;
        this.connected = true;

        this.start();
        this.emit('connected');
    }

    /**
     * On open
     */
    override onClose() {
        console.info('Disconnected.');

        this.connected = false;
        this.id = null;

        this.stop();

        this.emit('disconnected');
    }

    /**
     * On error
     */
    onError(e: unknown) {
        console.error(e);

        if (!this.connected) {
            this.onClose();
        }
    }
}
