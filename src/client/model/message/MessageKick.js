import { Message } from './Message.js';

/**
 * Kick message
 *
 * @param {Player} target
 */
export class MessageKick extends Message {
    constructor(target) {
        super();

        this.target = target;
    }
}

/**
 * Message type
 *
 * @type {String}
 */
MessageKick.prototype.type = 'kick';

/**
 * Default icon
 *
 * @type {String}
 */
MessageKick.prototype.icon = 'icon-megaphone';
