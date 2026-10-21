import { Message } from './Message.ts';

/**
 * Kick message
 */
export class MessageKick extends Message {
    target: any;

    /**
     * Message type
     */
    override type: string = 'kick';

    /**
     * Default icon
     */
    override icon: string = 'icon-megaphone';

    constructor(target: any) {
        super();

        this.target = target;
    }
}
