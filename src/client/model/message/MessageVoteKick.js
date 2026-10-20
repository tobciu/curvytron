import { Message } from './Message.js';

/**
 * New Kick vote message
 *
 * @param {Player} target
 */
export class MessageVoteKick extends Message {
    /**
     * Message type
     *
     * @type {String}
     */
    type = 'vote-kick';

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
