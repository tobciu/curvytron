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
    /**
     * Message type
     *
     * @type {String}
     */
    type = 'player';

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
