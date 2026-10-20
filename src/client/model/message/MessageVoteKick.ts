import { Message } from './Message.ts';

/**
 * New Kick vote message
 */
export class MessageVoteKick extends Message {
    target: any;

    /**
     * Message type
     */
    type: string = 'vote-kick';

    /**
     * Default icon
     */
    icon: string = 'icon-megaphone';

    constructor(target: any) {
        super();

        this.target = target;
    }
}
