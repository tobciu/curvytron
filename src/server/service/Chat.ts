import { Message } from '../model/Message.ts';
import { FloodFilter } from './FloodFilter.ts';
import { BaseChat } from '../../shared/service/BaseChat.ts';

/**
 * Chat system
 */
export class Chat extends BaseChat {
    floodFilter: FloodFilter;

    constructor() {
        super();

        this.floodFilter = new FloodFilter(this.messages);
    }

    /**
     * Is message valid?
     */
    override isValid(message: Message): boolean {
        const length = message.content.length;

        return length > 0 && length <= Message.maxLength && this.floodFilter.isValid(message);
    }
}
