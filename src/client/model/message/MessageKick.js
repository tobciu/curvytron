import { Message } from './Message.js';

/**
 * Kick message
 *
 * @param {Player} target
 */
export class MessageKick extends Message {
    /**
     * Message type
     *
     * @type {String}
     */
    type = 'kick';

    /**
     * Default icon
     *
     * @type {String}
     */
    icon = 'icon-megaphone';

    constructor(target) {
        super();

        this.target = target;
    }
}
