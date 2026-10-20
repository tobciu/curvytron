import { Message } from './Message.ts';

/**
 * Kick message
 */
export class MessageKick extends Message {
    target: any;

    /**
     * Message type
     */
    type: string = 'kick';

    /**
     * Default icon
     */
    icon: string = 'icon-megaphone';

    constructor(target: any) {
        super();

        this.target = target;
    }
}
