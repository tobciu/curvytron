import { Message } from './Message.ts';

/**
 * Room master message
 */
export class MessageRoomMaster extends Message {
    client: any;
    target: any;

    /**
     * Message type
     */
    type: string = 'room-master';

    /**
     * Default icon
     */
    icon: string = 'icon-megaphone';

    constructor(client: any) {
        super();

        this.client = client;
        this.target = this.getPlayer();
    }

    /**
     * Get target
     */
    getTarget() {
        const player = this.getPlayer();

        return player ? player : this.target;
    }

    /**
     * Get player
     */
    getPlayer() {
        return this.client.players.getFirst();
    }
}
