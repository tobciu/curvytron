import type { Message } from '../model/Message.ts';

/**
 * Chat flood filter
 */
export class FloodFilter {
    messages: any;

    /**
     * Number of message allowed
     */
    toleranceTotal: number = 3;

    /**
     * Range of time for tolerance
     */
    toleranceRange: number = 2000;

    constructor(messages: any) {
        this.messages = messages;
    }

    /**
     * Is message valid?
     */
    isValid(message: Message): boolean {
        const history = this.getClientHistory(message.client.id, Date.now() - this.toleranceRange);

        return history < this.toleranceTotal;
    }

    /**
     * Get client history
     */
    getClientHistory(id: number, max: any) {
        let history = 0,
            message;

        for (let i = this.messages.length - 1; i >= 0; i--) {
            message = this.messages[i];

            if (message.client.id === id) {
                history++;
            }

            if (message.creation < max) {
                break;
            }
        }

        return history;
    }
}
