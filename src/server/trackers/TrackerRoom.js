import Tracker from './Tracker.js';

/**
 * Room tracker
 */
class RoomTracker extends Tracker {
    constructor(inspector, room) {
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
    destroy() {
        this.room.removeListener('game:new', this.onGame);
        return super.destroy();
    }

    /**
     * @inheritDoc
     */
    getValues() {
        const data = super.getValues();
        data.games = this.games;
        return data;
    }
}

export default RoomTracker;
