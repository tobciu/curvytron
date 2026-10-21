import { Tracker } from './Tracker.ts';

/**
 * Room tracker
 */
export class RoomTracker extends Tracker {
    room: any;
    games: number;

    constructor(inspector: any, room: any) {
        super(inspector, room.name);

        this.room = room;
        this.games = 0;

        this.onGame = this.onGame.bind(this);

        this.room.on('game:new', this.onGame);
    }

    /**
     * On game
     */
    onGame() {
        this.games++;
    }

    /**
     * @inheritDoc
     */
    override destroy() {
        this.room.off('game:new', this.onGame);

        return super.destroy();
    }

    /**
     * @inheritDoc
     */
    override getValues() {
        const data = super.getValues();

        data.games = this.games;

        return data;
    }
}
