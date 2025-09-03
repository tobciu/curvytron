import EventEmitter from 'tom32i-event-emitter.js';
import Collection from '../Collection.js';
import BaseRoomConfig from './BaseRoomConfig.js';
import BaseGame from './BaseGame.js';

/**
 * Base Room
 */
class BaseRoom extends EventEmitter {
    constructor(name) {
        super();

        this.name = name;
        this.players = new Collection([], 'id', true);
        this.config = new BaseRoomConfig(this);
        this.game = null;

        this.closeGame = this.closeGame.bind(this);
    }

    /**
     * Number of player needed to start a room
     *
     * @type {Number}
     */
    minPlayer = 1;

    /**
     * Max length for name
     *
     * @type {Number}
     */
    maxLength = 25;

    /**
     * Launch time
     *
     * @type {Number}
     */
    launchTime = 5000;

    /**
     * Add player
     *
     * @param {Player} player
     */
    addPlayer(player) {
        return this.players.add(player);
    }

    /**
     * Equal
     *
     * @param {Room} room
     *
     * @return {Boolean}
     */
    equal(room) {
        return room ? this.name === room.name : false;
    }

    /**
     * Is name available?
     *
     * @param {String} name
     */
    isNameAvailable(name) {
        return !this.players.match(function () { return this.name === name; });
    }

    /**
     * Remove player
     *
     * @param {Player} player
     */
    removePlayer(player) {
        return this.players.remove(player);
    }

    /**
     * Is ready
     *
     * @return {Boolean}
     */
    isReady() {
        return !this.game && this.players.count() >= this.minPlayer && this.players.filter(function () { return !this.ready; }).isEmpty();
    }

    /**
     * Start warmpup
     */
    newGame() {
        if (!this.game) {
            this.game = new BaseGame(this);

            this.game.on('end', this.closeGame);
            this.emit('game:new', {room: this, game: this.game});

            return this.game;
        }

        return null;
    }

    /**
     * Close game
     */
    closeGame() {
        if (this.game) {

            delete this.game;

            this.emit('game:end', {room: this});

            this.players = this.players.filter(function () { return this.client; });

            for (let i = this.players.items.length - 1; i >= 0; i--) {
                this.players.items[i].reset();
            }
        }
    }

    /**
     * Serialize
     *
     * @return {Object}
     */
    serialize(full) {
        full = typeof(full) === 'undefined' || full;

        const data = {
            name: this.name,
            players: full ? this.players.map(function () { return this.serialize(); }).items : this.players.count(),
            game: this.game ? true : false,
            open: this.config.open
        };

        if (full) {
            data.config = this.config.serialize();
        }

        return data;
    }
}

export default BaseRoom;
