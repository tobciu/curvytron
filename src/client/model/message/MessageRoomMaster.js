import { Message } from './Message.js';

/**
 * Room master message
 *
 * @param {SocketClient} client
 */
export class MessageRoomMaster extends Message {
    constructor(client) {
        super();

        this.client = client;
        this.target = this.getPlayer();
    }

    /**
     * Get target
     *
     * @return {Player}
     */
    getTarget() {
        const player = this.getPlayer();

        return player ? player : this.target;
    }

    /**
     * Get player
     *
     * @return {Player}
     */
    getPlayer() {
        return this.client.players.getFirst();
    }
}

/**
 * Message type
 *
 * @type {String}
 */
MessageRoomMaster.prototype.type = 'room-master';

/**
 * Default icon
 *
 * @type {String}
 */
MessageRoomMaster.prototype.icon = 'icon-megaphone';
