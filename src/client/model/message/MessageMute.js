import { Message } from './Message.js';

/**
 * Mute message
 *
 * @param {Number} client
 * @param {Player} player
 */
export class MessageMute extends Message {
    constructor(client, player) {
        super();

        this.client = client;
        this.player = player;
    }
}

/**
 * Message type
 *
 * @type {String}
 */
MessageMute.prototype.type = 'mute';

/**
 * Default icon
 *
 * @type {String}
 */
MessageMute.prototype.icon = 'icon-megaphone';
