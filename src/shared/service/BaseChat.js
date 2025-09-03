import EventEmitter from 'tom32i-event-emitter.js';

/**
 * BaseChat system
 */
class BaseChat extends EventEmitter {
    constructor() {
        super();
        this.messages = new Collection([], 'id', true);
    }

    /**
     * Add message
     *
     * @param {Message} message
     */
    addMessage(message) {
        if (!this.isValid(message)) {
            return false;
        }

        this.messages.add(message);
        this.emit('message', message);

        return true;
    }

    /**
     * Is message valid?
     *
     * @param {Message} message
     *
     * @return {Boolean}
     */
    isValid(message) {
        return true;
    }

    /**
     * Clear messages
     */
    clearMessages() {
        this.messages.clear();
    }

    /**
     * Serialize
     *
     * @return {Array}
     */
    serialize(max) {
        const length = this.messages.items.length;
        const limit = typeof(max) === 'number' ? Math.min(max, length) : length;
        const min = length - limit;
        const messages = new Array(length);

        for (let i = length - 1; i >= min; i--) {
            messages[i] = this.messages.items[i].serialize();
        }

        return messages;
    }
}

export default BaseChat;
