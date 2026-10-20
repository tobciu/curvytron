import { RoomController } from '../controller/RoomController.js';
import { BaseRoom } from '../../shared/model/BaseRoom.js';
import { RoomConfig } from './RoomConfig.js';
import { Game } from './Game.js';

/**
 * Room
 *
 * @param {String} name
 */
export class Room extends BaseRoom {
    constructor(name) {
        super(name);

        this.controller = new RoomController(this);
    }

    /**
     * Create the room configuration
     *
     * @return {RoomConfig}
     */
    createConfig() {
        return new RoomConfig(this);
    }

    /**
     * Create a game
     *
     * @return {Game}
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
     *
     * @param {Player} player
     */
    addPlayer(player) {
        const result = super.addPlayer(player);

        if (result) {
            this.emit('player:join', { room: this, player });
        }

        return result;
    }

    /**
     * Remove player
     *
     * @param {Player} player
     */
    removePlayer(player) {
        const result = super.removePlayer(player);

        if (result) {
            this.emit('player:leave', { room: this, player });
        }

        return result;
    }
}
