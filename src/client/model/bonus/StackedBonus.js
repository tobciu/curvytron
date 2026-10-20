import { EventEmitter } from '#event-emitter';
import { BonusManager } from '../../manager/BonusManager.js';

/**
 * Stacked Bonus (for display in avatar's bonus stack)
 *
 * @param {Number} id
 * @param {String} type
 * @param {Number} duration
 */
export class StackedBonus extends EventEmitter {
    constructor(id, type, duration) {
        super();

        this.id = id;
        this.duration = duration;
        this.asset = this.assets[type];
        this.changed = true;

        this.setEnding = this.setEnding.bind(this);
        this.toggleOpacity = this.toggleOpacity.bind(this);
    }

    /**
     * Clear
     */
    clear() {
        if (this.timeout) {
            this.timeout = clearInterval(this.timeout);
        }
    }

    /**
     * Set ending timeout
     *
     * @param {Number} warning
     */
    setEndingTimeout(warning) {
        this.timeout = setTimeout(this.setEnding, this.duration - warning);
    }

    /**
     * Set ending
     */
    setEnding() {
        this.timeout = setInterval(this.toggleOpacity, 100);
    }

    /**
     * Toggle opacity
     */
    toggleOpacity() {
        this.opacity = this.opacity === 1 ? 0.5 : 1;
        this.changed = true;
        this.emit('change');
    }
}

/**
 * Assets
 *
 * @type {Object}
 */
StackedBonus.prototype.assets = BonusManager.prototype.assets;

/**
 * Opacity
 *
 * @type {Number}
 */
StackedBonus.prototype.opacity = 1;
