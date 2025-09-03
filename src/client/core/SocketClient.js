import BaseSocketClient from '../../shared/core/BaseSocketClient.js';

/**
 * SocketClient
 */
class SocketClient extends BaseSocketClient {
    constructor() {
        const Socket = window.MozWebSocket || window.WebSocket;
        const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
        super(new Socket(protocol + document.location.host + document.location.pathname, ['websocket']));

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
     *
     * @param {Socket} socket
     */
    onOpen(e) {
        console.info('Socket open.');
        this.addEvent('whoami', null, this.onConnection);
    }

    /**
     * On open
     *
     * @param {Event} e
     */
    onConnection(id) {
        console.info('Connected with id "%s".', id);

        this.id = id;
        this.connected = true;

        this.start();
        this.emit('connected');
    }

    /**
     * On open
     *
     * @param {Event} e
     */
    onClose(e) {
        console.info('Disconnected.');

        this.connected = false;
        this.id = null;

        this.stop();

        this.emit('disconnected');
    }

    /**
     * On error
     *
     * @param {Event} e
     */
    onError(e) {
        console.error(e);

        if (!this.connected) {
            this.onClose();
        }
    }
}

export default SocketClient;
