import { Message } from './Message.js';

/**
 * New Kick vote message
 *
 * @param {Player} target
 */
export class MessageVoteKick extends Message {
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
MessageVoteKick.prototype.type = 'vote-kick';

/**
 * Default icon
 *
 * @type {String}
 */
MessageVoteKick.prototype.icon = 'icon-megaphone';
