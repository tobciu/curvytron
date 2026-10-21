import { BasePlayer } from '../../shared/model/BasePlayer.ts';
import { Avatar } from './Avatar.ts';
import type { SocketClient } from '../core/SocketClient.ts';

/**
 * Player
 */
export class Player extends BasePlayer {
    declare client: SocketClient;

    constructor(client: SocketClient, name: string, color?: string) {
        super(client, name, color);
    }

    /**
     * Create the avatar
     */
    createAvatar() {
        return new Avatar(this);
    }

    /**
     * Serialize
     */
    override serialize() {
        const data: Record<string, any> = super.serialize();

        data.active = this.client.active;

        return data;
    }
}
