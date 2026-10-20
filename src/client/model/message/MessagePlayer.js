import { Message } from './Message.js';

/**
 * Player Message
 *
 * @param {SocketClient} client
 * @param {String} content
 * @param {Player} player
 * @param {Number} creation
 */
export class MessagePlayer extends Message {
    constructor(client, content, player, creation) {
        super(creation);

        this.client = client;
        this.content = content;
        this.player = player;
    }

    /**
     * Clear message
     */
    clear() {
        this.content = '';
    }
}

/**
 * Message type
 *
 * @type {String}
 */
MessagePlayer.prototype.type = 'player';
