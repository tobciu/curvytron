import { Tracker } from './Tracker.js';

/**
 * Game tracker
 *
 * @param {Inspector} inspector
 * @param {Game} game
 */
export class GameTracker extends Tracker {
    constructor(inspector, game) {
        super(inspector, game.name);

        this.game = game;
        this.size = this.game.avatars.count();
        this.rounds = 0;
        this.finished = false;
        this.fpsInterval = null;

        this.onRound = this.onRound.bind(this);
        this.onStart = this.onStart.bind(this);
        this.onStop = this.onStop.bind(this);
        this.onEnd = this.onEnd.bind(this);
        this.sendFPS = this.sendFPS.bind(this);

        this.game.on('round:new', this.onRound);
        this.game.on('game:start', this.onStart);
        this.game.on('game:stop', this.onStop);
        this.game.on('end', this.onEnd);
    }

    /**
     * On round
     */
    onRound() {
        this.rounds++;
    }

    /**
     * On round
     */
    onEnd() {
        this.finished = this.game.gameWinner !== null;
    }

    /**
     * On start
     */
    onStart() {
        if (!this.fpsInterval) {
            this.fpsInterval = setInterval(this.sendFPS, this.fpsFrequency);
        }
    }

    /**
     * On start
     */
    onStop() {
        if (this.fpsInterval) {
            clearInterval(this.fpsInterval);
            this.fpsInterval = null;
        }
    }

    /**
     * On round
     */
    sendFPS() {
        if (this.game.fps.frequency) {
            this.emit('fps', { tracker: this, fps: this.game.fps.frequency });
        }
    }

    /**
     * @inheritDoc
     */
    destroy() {
        this.onStop();

        this.game.off('end', this.onEnd);
        this.game.off('round:new', this.onRound);

        return super.destroy();
    }

    /**
     * @inheritDoc
     */
    getValues() {
        const data = super.getValues();

        data.size = this.size;
        data.rounds = this.rounds;
        data.finished = this.finished;

        return data;
    }
}

/**
 * FPS log frequency
 *
 * @type {Number}
 */
GameTracker.prototype.fpsFrequency = 1000;
