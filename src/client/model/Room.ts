import { BaseRoom } from '../../shared/model/BaseRoom.ts';
import { RoomConfig } from './RoomConfig.ts';
import { Game } from './Game.ts';
import type { Collection } from '../../shared/Collection.ts';
import type { Player } from './Player.ts';

/**
 * Room
 */
export class Room extends BaseRoom {
    declare config: RoomConfig;
    declare game: Game | undefined;
    declare players: Collection<Player>;

    constructor(name: string) {
        super(name);

        this.players.index = false;
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
     * Get local players
     */
    getLocalPlayers() {
        return this.players.filter(function () {
            return this.local;
        });
    }

    /**
     * Get player by client Id
     */
    getPlayerByClient(client: number) {
        return this.players.match(function () {
            return this.client.id === client;
        });
    }

    /**
     * Get url
     */
    getUrl(): string {
        return `/room/${encodeURIComponent(this.name)}`;
    }

    /**
     * Get game url
     */
    getGameUrl(): string {
        return `/game/${encodeURIComponent(this.name)}`;
    }

    /**
     * Close game
     */
    override closeGame() {
        for (let i = this.players.items.length - 1; i >= 0; i--) {
            const avatar = this.players.items[i].avatar;

            // A player that came in the middle of the game stays in the room, the others are gone
            if (!avatar?.present && !avatar?.late) {
                this.removePlayer(this.players.items[i]);
            }
        }

        return super.closeGame();
    }
}
