import { Message } from './Message.js';

/**
 * Mute message
 *
 * @param {Number} client
 * @param {Player} player
 */
export class MessageMute extends Message {
    /**
     * Message type
     *
     * @type {String}
     */
    type = 'mute';

    /**
     * Default icon
     *
     * @type {String}
     */
    icon = 'icon-megaphone';

    constructor(client, player) {
        super();

        this.client = client;
        this.player = player;
    }
}
