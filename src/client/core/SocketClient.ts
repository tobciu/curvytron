import { BaseSocketClient } from '../../shared/core/BaseSocketClient.ts';

/**
 * SocketClient
 */
export class SocketClient extends BaseSocketClient {
    id: any;
    connected: boolean;

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
        this.addEvent('whoami', null, this.onConnection);
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
    onClose() {
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
