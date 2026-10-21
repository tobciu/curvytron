import { Message } from './Message.ts';

/**
 * Mute message
 */
export class MessageMute extends Message {
    client: any;
    player: any;

    /**
     * Message type
     */
    override type: string = 'mute';

    /**
     * Default icon
     */
    override icon: string = 'icon-megaphone';

    constructor(client: any, player: any) {
        super();

        this.client = client;
        this.player = player;
    }
}
