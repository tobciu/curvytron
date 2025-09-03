import EventEmitter from 'tom32i-event-emitter.js';
import Collection from '../Collection.js';

/**
 * Base Bonus Manager
 */
class BaseBonusManager extends EventEmitter {
    /**
     * Maximum number of bonus on the map at the same time
     *
     * @type {Number}
     */
    bonusCap = 20;

    /**
     * Interval between two bonus pop (will vary from a factor x1 to x3)
     *
     * @type {Number}
     */
    bonusPopingTime = 3000;

    /**
     * Margin from bonus to trails
     *
     * @type {Number}
     */
    bonusPopingMargin = 0.01;

    constructor(game) {
        super();

        this.game = game;
        this.bonuses = new Collection([], 'id', true);

        this.clear = this.clear.bind(this);
    }

    /**
     * Start
     */
    start() {
        this.clear();
    }

    /**
     * Stop
     */
    stop() {
        this.clear();
    }

    /**
     * Add bonus
     *
     * @param {Bonus} bonus
     */
    add(bonus) {
        return this.bonuses.add(bonus);
    }

    /**
     * Remove bonus
     *
     * @param {Bonus} bonus
     */
    remove(bonus) {
        bonus.clear();
        return this.bonuses.remove(bonus);
    }

    /**
     * Clear bonuses
     */
    clear() {
        for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
            this.bonuses.items[i].clear();
        }
        this.bonuses.clear();
    }
}

export default BaseBonusManager;
