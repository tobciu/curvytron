import type { MessageData } from '../../shared/protocol.ts';

/**
 * Message
 */
export class Message {
    client: any;
    content: any;
    creation: Date;
    name: any;
    color: any;

    /**
     * Message max length
     */
    static maxLength: any = 140;

    constructor(client: any, content: any) {
        this.client = client;
        this.content = content;
        this.creation = new Date();
        this.name = null;
        this.color = null;

        this.buildPlayer();
    }

    /**
     * Build player
     */
    buildPlayer() {
        const player = this.client.players.getFirst();

        if (player) {
            this.name = player.name;
            this.color = player.color;
        }
    }

    /**
     * Serialize
     */
    serialize(): MessageData {
        if (this.name === null) {
            this.buildPlayer();
        }

        return {
            client: this.client.id,
            content: this.content,
            creation: this.creation.getTime(),
            name: this.name,
            color: this.color
        };
    }
}
