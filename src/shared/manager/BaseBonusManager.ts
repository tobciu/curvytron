import { EventEmitter } from '#event-emitter';
import { Collection } from '../Collection.ts';
import type { BaseBonus } from '../model/BaseBonus.ts';
import type { BaseGame } from '../model/BaseGame.ts';

/**
 * Base Bonus Manager
 */
export class BaseBonusManager extends EventEmitter {
    game: BaseGame;
    bonuses: Collection<BaseBonus>;

    /**
     * Maximum number of bonus on the map at the same time
     */
    bonusCap: number = 20;

    /**
     * Interval between two bonus pop (will vary from a factor x1 to x3)
     */
    bonusPopingTime: number = 3000;

    /**
     * Margin from bonus to trails
     */
    bonusPopingMargin: number = 0.01;

    constructor(game: BaseGame) {
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
     */
    add(bonus: BaseBonus) {
        return this.bonuses.add(bonus);
    }

    /**
     * Remove bonus
     */
    remove(bonus: BaseBonus) {
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
