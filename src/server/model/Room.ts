import { RoomController } from '../controller/RoomController.ts';
import { BaseRoom } from '../../shared/model/BaseRoom.ts';
import { RoomConfig } from './RoomConfig.ts';
import { Game } from './Game.ts';
import type { Player } from './Player.ts';
import type { Collection } from '../../shared/Collection.ts';

/**
 * Room
 */
export class Room extends BaseRoom {
    declare config: RoomConfig;
    declare game: Game | undefined;
    declare players: Collection<Player>;
    controller: RoomController;

    constructor(name: string) {
        super(name);

        this.controller = new RoomController(this);
    }

    /**
     * Create the room configuration
     */
    createConfig() {
        return new RoomConfig(this);
    }

    /**
     * Create a game
     */
    createGame() {
        return new Game(this);
    }

    /**
     * Close
     */
    close() {
        this.emit('close', { room: this });
    }

    /**
     * Add player
     */
    addPlayer(player: Player) {
        const result = super.addPlayer(player);

        if (result) {
            this.emit('player:join', { room: this, player });
        }

        return result;
    }

    /**
     * Remove player
     */
    removePlayer(player: Player) {
        const result = super.removePlayer(player);

        if (result) {
            this.emit('player:leave', { room: this, player });
        }

        return result;
    }
}
