import { BasePlayer } from '../../shared/model/BasePlayer.js';
import { Avatar } from './Avatar.js';

/**
 * Player
 *
 * @param {SocketClient} client
 * @param {String} name
 * @param {String} color
 */
export class Player extends BasePlayer {
    constructor(client, name, color) {
        super(client, name, color);
    }

    /**
     * Create the avatar
     *
     * @return {Avatar}
     */
    createAvatar() {
        return new Avatar(this);
    }

    /**
     * Serialize
     *
     * @return {Object}
     */
    serialize() {
        const data = super.serialize();

        data.active = this.client.active;

        return data;
    }
}
