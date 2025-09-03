import BaseRoom from '../../shared/model/BaseRoom.js';
import RoomConfig from './RoomConfig.js';
import Player from './Player.js';
import Collection from '../../shared/Collection.js';

/**
 * Room
 */
export default class Room extends BaseRoom {
    constructor(name) {
        super(name);

        this.config = new RoomConfig(this);
        this.clients = new Collection();
    }

    /**
     * Get local players
     *
     * @return {Collection}
     */
    getLocalPlayers() {
        return this.players.filter(p => p.local);
    }

    /**
     * Get player by client Id
     *
     * @param {Number} client
     *
     * @return {Player}
     */
    getPlayerByClient(client) {
        return this.players.match(p => p.client.id === client);
    }

    /**
     * Get url
     *
     * @return {String}
     */
    getUrl() {
        return '/room/' + encodeURIComponent(this.name);
    }

    /**
     * Get game url
     *
     * @return {String}
     */
    getGameUrl() {
        return '/game/' + encodeURIComponent(this.name);
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
        if (this.game) {
            this.game.end();
            this.game = null;
        }
    }
}
