import EventEmitter from 'tom32i-event-emitter.js';
import Collection from '../Collection.js';

/**
 * Base Bonus Stack
 */
class BaseBonusStack extends EventEmitter {
    constructor(target) {
        super();

        this.target = target;
        this.bonuses = new Collection();
    }

    /**
     * Add bonus to the stack
     *
     * @param {Bonus} bonus
     */
    add(bonus) {
        if (this.bonuses.add(bonus)) {
            this.resolve();
        }
    }

    /**
     * Remove bonus from the stack
     *
     * @param {Bonus} bonus
     */
    remove(bonus) {
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
    resolve(bonus) {
        const properties = {};
        let effects, property, i, j;

        if (typeof(bonus) !== 'undefined') {
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

                if (typeof(properties[property]) === 'undefined') {
                    properties[property] = this.getDefaultProperty(property);
                }

                this.append(properties, property, effects[j][1]);
            }
        }

        for (property in properties) {
            if (properties.hasOwnProperty(property)) {
                this.apply(property, properties[property]);
            }
        }
    }

    /**
     * Apply the value to target's property
     *
     * @param {String} property
     * @param {Number} value
     */
    apply(property, value) {
        this.target[property] = value;
    }

    /**
     * Get default property
     *
     * @param {String} property
     *
     * @return {Number}
     */
    getDefaultProperty(property) {
        return 0;
    }

    /**
     * Append
     *
     * @param {Object} properties
     * @param {String} property
     * @param {Number} value
     */
    append(properties, property, value) {
        properties[property] += value;
    }
}

export default BaseBonusStack;
