import { BasePlayer } from '../../shared/model/BasePlayer.ts';
import { Avatar } from './Avatar.ts';
import type { PlayerData } from '../../shared/protocol.ts';
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
    override serialize(): PlayerData {
        return { ...super.serialize(), active: this.client.active };
    }
}
