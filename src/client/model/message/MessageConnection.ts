import { Message } from './Message.ts';
import type { Player } from '../Player.ts';

/**
 * A player lost the connection, or is back
 */
export class MessageConnection extends Message {
    target: Player;
    online: boolean;

    /**
     * Message type
     */
    override type: string = 'connection';

    /**
     * Default icon
     */
    override icon: string = 'icon-megaphone';

    constructor(target: Player, online: boolean) {
        super();

        this.target = target;
        this.online = online;
    }
}
