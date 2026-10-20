import { EventEmitter } from '#event-emitter';
import { Collection } from '../Collection.ts';
import type { BaseBonus } from './BaseBonus.ts';

/**
 * Base Bonus Stack
 */
export class BaseBonusStack extends EventEmitter {
    /** What the bonuses change: an avatar or a game. Its properties are set by name. */
    target: any;
    bonuses: Collection<BaseBonus>;

    constructor(target: any) {
        super();

        this.target = target;
        this.bonuses = new Collection();
    }

    /**
     * Add bonus to the stack
     */
    add(bonus: BaseBonus) {
        if (this.bonuses.add(bonus)) {
            this.resolve();
        }
    }

    /**
     * Remove bonus from the stack
     */
    remove(bonus: BaseBonus) {
        if (this.bonuses.remove(bonus)) {
            this.resolve(bonus);
        }
    }

    /**
     * Clear
     */
    clear() {
        this.bonuses.clear();
    }

    /**
     * Resolve
     */
    resolve(bonus?: BaseBonus) {
        const properties: Record<string, any> = {};
        let effects: Array<[string, any]>;
        let property: string;
        let i: number;
        let j: number;

        if (typeof bonus !== 'undefined') {
            effects = bonus.getEffects(this.target);
            for (i = effects.length - 1; i >= 0; i--) {
                property = effects[i][0];
                properties[property] = this.getDefaultProperty(property);
            }
        }

        for (i = this.bonuses.items.length - 1; i >= 0; i--) {
            effects = this.bonuses.items[i].getEffects(this.target);
            for (j = effects.length - 1; j >= 0; j--) {
                property = effects[j][0];

                if (typeof properties[property] === 'undefined') {
                    properties[property] = this.getDefaultProperty(property);
                }

                this.append(properties, property, effects[j][1]);
            }
        }

        for (property in properties) {
            if (Object.hasOwn(properties, property)) {
                this.apply(property, properties[property]);
            }
        }
    }

    /**
     * Apply the value to target's property
     */
    apply(property: string, value: any) {
        this.target[property] = value;
    }

    /**
     * Get default property
     */
    getDefaultProperty(property: string): any {
        return 0;
    }

    /**
     * Append
     */
    append(properties: Record<string, any>, property: string, value: any) {
        properties[property] += value;
    }
}
