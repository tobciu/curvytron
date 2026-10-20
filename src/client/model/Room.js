import { BaseRoom } from '../../shared/model/BaseRoom.js';
import { RoomConfig } from './RoomConfig.js';
import { Game } from './Game.js';

/**
 * Room
 */
export class Room extends BaseRoom {
    constructor(name) {
        super(name);

        this.players.index = false;
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
     * Get local players
     *
     * @return {Collection}
     */
    getLocalPlayers() {
        return this.players.filter(function () {
            return this.local;
        });
    }

    /**
     * Get player by client Id
     *
     * @param {Number} client
     *
     * @return {Player}
     */
    getPlayerByClient(client) {
        return this.players.match(function () {
            return this.client.id === client;
        });
    }

    /**
     * Get url
     *
     * @return {String}
     */
    getUrl() {
        return `/room/${encodeURIComponent(this.name)}`;
    }

    /**
     * Get game url
     *
     * @return {String}
     */
    getGameUrl() {
        return `/game/${encodeURIComponent(this.name)}`;
    }

    /**
     * Close game
     */
    closeGame() {
        for (let i = this.players.items.length - 1; i >= 0; i--) {
            if (!this.players.items[i].avatar.present) {
                this.removePlayer(this.players.items[i]);
            }
        }

        return super.closeGame();
    }
}
