import BaseBonusManager from '../../shared/manager/BaseBonusManager.js';
import World from '../core/World.js';
import Body from '../core/Body.js';
import BaseBonus from '../../shared/model/BaseBonus.js';

/**
 * Bonus Manager
 */
class BonusManager extends BaseBonusManager {
    constructor(game, bonuses, rate) {
        super(game);

        this.world = new World(this.game.size, 1);
        this.popingTimeout = null;
        this.bonusTypes = bonuses;
        this.bonusPopingTime = this.bonusPopingTime - ((this.bonusPopingTime / 2) * rate);

        this.popBonus = this.popBonus.bind(this);
    }

    /**
     * Start
     */
    start() {
        super.start();
        this.world.activate();

        if (this.bonusTypes.length) {
            this.popingTimeout = setTimeout(this.popBonus, this.getRandomPopingTime());
        }
    }

    /**
     * Stop
     */
    stop() {
        if (this.popingTimeout) {
            this.popingTimeout = clearTimeout(this.popingTimeout);
        }
        super.stop();
    }

    /**
     * Clear
     */
    clear() {
        this.world.clear();
        super.clear();
    }

    /**
     * Make a bonus 'pop'
     */
    popBonus() {
        if (this.bonusTypes.length) {
            this.popingTimeout = setTimeout(this.popBonus, this.getRandomPopingTime());

            if (this.bonuses.count() < this.bonusCap) {
                const bonusType = this.getRandomBonusType();

                if (bonusType) {
                    const position = this.getRandomPosition(BaseBonus.prototype.radius, this.bonusPopingMargin);
                    const bonus = new (bonusType)(position[0], position[1]);
                    this.add(bonus);
                }
            }
        }
    }

    /**
     * Get random position
     *
     * @param {Number} radius
     * @param {Number} border
     *
     * @return {Array}
     */
    getRandomPosition(radius, border) {
        const margin = radius + border * this.game.world.size;
        const body = new Body(
            this.game.world.getRandomPoint(margin),
            this.game.world.getRandomPoint(margin),
            margin
        );

        while (!this.game.world.testBody(body) || !this.world.testBody(body)) {
            body.x = this.game.world.getRandomPoint(margin);
            body.y = this.game.world.getRandomPoint(margin);
        }

        return [body.x, body.y];
    }

    /**
     * Test if an avatar catches a bonus
     *
     * @param {Avatar} avatar
     */
    testCatch(avatar) {
        if (avatar.body) {
            const body = this.world.getBody(avatar.body);
            const bonus = body ? body.data : null;

            if (bonus && this.remove(bonus)) {
                bonus.applyTo(avatar, this.game);
            }
        }
    }

    /**
     * Add bonus
     *
     * @param {Bonus} bonus
     */
    add(bonus) {
        if (super.add(bonus)) {
            this.world.addBody(bonus.body);
            this.emit('bonus:pop', bonus);
            return true;
        }
        return false;
    }

    /**
     *  Remove bonus
     *
     * @param {Bonus} bonus
     */
    remove(bonus) {
        if (super.remove(bonus)) {
            this.world.removeBody(bonus.body);
            this.emit('bonus:clear', bonus);
            return true;
        }
        return false;
    }

    /**
     * Get random printing time
     *
     * @return {Number}
     */
    getRandomPopingTime() {
        return this.bonusPopingTime * (1 + Math.random());
    }

    /**
     * Get random bonus type
     *
     * @return {Bonus}
     */
    getRandomBonusType() {
        if (!this.bonusTypes.length) { return null; }

        const total = this.bonusTypes.length;
        const pot = [];
        const bonuses = [];

        for (let i = 0; i < total; i++) {
            const bonusType = this.bonusTypes[i];
            const probability = bonusType.prototype.getProbability(this.game);

            if (probability > 0) {
                bonuses.push(bonusType);
                pot.push(probability + (i > 0 ? pot[pot.length - 1] : 0));
            }
        }

        const value = Math.random() * pot[pot.length - 1];

        for (let i = 0; i < total; i++) {
            if (value < pot[i]) {
                return bonuses[i];
            }
        }

        return null;
    }

    /**
     * Update size
     */
    setSize() {
        this.world.clear();
        this.world = new World(this.game.size, 1);
    }
}

export default BonusManager;
