import { EventEmitter } from '#event-emitter';
import { Collection } from '../Collection.ts';
import type { BaseGame } from './BaseGame.ts';
import type { BasePlayer } from './BasePlayer.ts';
import type { BaseRoomConfig } from './BaseRoomConfig.ts';
import type { RoomData } from '../protocol.ts';

/**
 * Base Room
 */
export abstract class BaseRoom extends EventEmitter {
    name: string;
    players: Collection<BasePlayer>;
    config: BaseRoomConfig;
    game: BaseGame | undefined;

    /** Groups the games of the room by an occasion ("daily"), set when the room is created, see `shared/tag.ts` */
    tag: string | null = null;

    /**
     * Number of player needed to start a room
     */
    minPlayer: number = 1;

    /**
     * Max length for name
     */
    static maxLength = 25;

    /**
     * Launch time
     */
    launchTime: number = 5000;

    /** Create the configuration of the room */
    abstract createConfig(): BaseRoomConfig;

    /** Create a game with the players of the room */
    abstract createGame(): BaseGame;

    constructor(name: string) {
        super();

        this.name = name;
        this.players = new Collection([], 'id', true);
        this.config = this.createConfig();

        this.closeGame = this.closeGame.bind(this);
    }

    /**
     * Add player
     */
    addPlayer(player: BasePlayer) {
        return this.players.add(player);
    }

    /**
     * Equal
     */
    equal(room: BaseRoom | null): boolean {
        return room ? this.name === room.name : false;
    }

    /**
     * Is name available?
     */
    isNameAvailable(name: string) {
        return !this.players.match(function () {
            return this.name === name;
        });
    }

    /**
     * Remove player
     */
    removePlayer(player: BasePlayer) {
        return this.players.remove(player);
    }

    /**
     * Is ready
     */
    isReady(): boolean {
        return (
            !this.game &&
            this.players.count() >= this.minPlayer &&
            this.players
                .filter(function () {
                    return !this.ready;
                })
                .isEmpty()
        );
    }

    /**
     * Start warmpup
     */
    newGame() {
        if (!this.game) {
            this.game = this.createGame();

            this.game.on('end', this.closeGame);
            this.emit('game:new', { room: this, game: this.game });

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

            this.emit('game:end', { room: this });

            this.players = this.players.filter(function () {
                return this.client;
            });

            for (let i = this.players.items.length - 1; i >= 0; i--) {
                this.players.items[i].reset();
            }
        }
    }

    /**
     * Serialize
     */
    serialize(full?: boolean): RoomData {
        full = full === undefined || full;

        const data: RoomData = {
            name: this.name,
            players: full
                ? this.players.map(function () {
                      return this.serialize();
                  }).items
                : this.players.count(),
            game: !!this.game,
            open: this.config.open
        };

        if (this.tag) {
            data.tag = this.tag;
        }

        if (full) {
            data.config = this.config.serialize();
        }

        return data;
    }
}
