import { EventEmitter } from '#event-emitter';
import { Collection } from '../Collection.ts';

/**
 * BaseChat system
 */
export class BaseChat extends EventEmitter {
    messages: Collection;

    constructor() {
        super();

        this.messages = new Collection([], 'id', true);
    }

    /**
     * Add message
     */
    addMessage(message: any) {
        if (!this.isValid(message)) {
            return false;
        }

        this.messages.add(message);
        this.emit('message', message);

        return true;
    }

    /**
     * Is message valid?
     */
    isValid(message: any): boolean {
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
     */
    serialize(max?: any) {
        const length = this.messages.items.length,
            limit = typeof max === 'number' ? Math.min(max, length) : length,
            min = length - limit,
            messages = new Array(length);

        for (let i = length - 1; i >= min; i--) {
            messages[i] = this.messages.items[i].serialize();
        }

        return messages;
    }
}
