import { Body } from '../core/Body.ts';
import { World } from '../core/World.ts';
import { BaseBonusManager } from '../../shared/manager/BaseBonusManager.ts';
import { BaseBonus } from '../../shared/model/BaseBonus.ts';
import type { Avatar } from '../model/Avatar.ts';
import type { Game } from '../model/Game.ts';
import type { Bonus } from '../model/Bonus/Bonus.ts';

/**
 * Bonus Manager
 */
export class BonusManager extends BaseBonusManager {
    world: World;
    popingTimeout: any;
    bonusTypes: any;
    declare game: Game;

    constructor(game: Game, bonuses: any, rate: number) {
        super(game);

        this.world = new World(this.game.size, 1);
        this.popingTimeout = null;
        this.bonusTypes = bonuses;
        this.bonusPopingTime = this.bonusPopingTime - (this.bonusPopingTime / 2) * rate;

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
                    const position = this.getRandomPosition(BaseBonus.radius, this.bonusPopingMargin),
                        bonus = new bonusType(position[0], position[1]);
                    this.add(bonus);
                }
            }
        }
    }

    /**
     * Get random position
     */
    getRandomPosition(radius: number, border: number) {
        const margin = radius + border * this.game.world.size,
            body = new Body(this.game.world.getRandomPoint(margin), this.game.world.getRandomPoint(margin), margin);

        while (!this.game.world.testBody(body) || !this.world.testBody(body)) {
            body.x = this.game.world.getRandomPoint(margin);
            body.y = this.game.world.getRandomPoint(margin);
        }

        return [body.x, body.y];
    }

    /**
     * Test if an avatar catches a bonus
     */
    testCatch(avatar: Avatar) {
        if (avatar.body) {
            const body = this.world.getBody(avatar.body),
                bonus = body ? body.data : null;

            if (bonus && this.remove(bonus)) {
                bonus.applyTo(avatar, this.game);
            }
        }
    }

    /**
     * Add bonus
     */
    add(bonus: Bonus) {
        if (super.add(bonus)) {
            this.world.addBody(bonus.body);
            this.emit('bonus:pop', bonus);

            return true;
        }

        return false;
    }

    /**
     *  Remove bonus
     */
    remove(bonus: Bonus) {
        if (super.remove(bonus)) {
            this.world.removeBody(bonus.body);
            this.emit('bonus:clear', bonus);

            return true;
        }

        return false;
    }

    /**
     * Get random printing time
     */
    getRandomPopingTime(): number {
        return this.bonusPopingTime * (1 + Math.random());
    }

    /**
     * Get random bonus type
     */
    getRandomBonusType() {
        if (!this.bonusTypes.length) {
            return null;
        }

        const total = this.bonusTypes.length;
        const pot: number[] = [];
        const bonuses = [];
        let probability;
        let bonusType;

        for (let i = 0; i < total; i++) {
            bonusType = this.bonusTypes[i];
            probability = bonusType.getProbability(this.game);

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
