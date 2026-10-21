import { Message } from './Message.ts';

/**
 * New Kick vote message
 */
export class MessageVoteKick extends Message {
    target: any;

    /**
     * Message type
     */
    override type: string = 'vote-kick';

    /**
     * Default icon
     */
    override icon: string = 'icon-megaphone';

    constructor(target: any) {
        super();

        this.target = target;
    }
}
