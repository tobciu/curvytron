import { Message } from '../model/Message.js';
import { FloodFilter } from './FloodFilter.js';
import { BaseChat } from '../../shared/service/BaseChat.js';

/**
 * Chat system
 */
export class Chat extends BaseChat {
    constructor() {
        super();

        this.floodFilter = new FloodFilter(this.messages);
    }

    /**
     * Is message valid?
     *
     * @param {Message} message
     *
     * @return {Boolean}
     */
    isValid(message) {
        const length = message.content.length;

        return length > 0 && length <= Message.maxLength && this.floodFilter.isValid(message);
    }
}
