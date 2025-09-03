import BaseChat from '../../shared/service/BaseChat.js';
import FloodFilter from './FloodFilter.js';
import Message from '../model/Message.js';

/**
 * Chat system
 */
class Chat extends BaseChat {
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
        return length > 0 && length <= Message.prototype.maxLength && this.floodFilter.isValid(message);
    }
}

export default Chat;
