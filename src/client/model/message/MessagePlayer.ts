import { Message } from './Message.ts';

/**
 * Player Message
 */
export class MessagePlayer extends Message {
    client: any;
    content: any;
    player: any;

    /**
     * Message type
     */
    type: string = 'player';

    constructor(client: any, content?: any, player?: any, creation?: any) {
        super(creation);

        this.client = client;
        this.content = content;
        this.player = player;
    }

    /**
     * Clear message
     */
    clear() {
        this.content = '';
    }
}
