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
    /**
     * Assets
     *
     * @type {Object}
     */
    /**
     * Opacity
     *
     * @type {Number}
     */
    opacity = 1;

    constructor(id, type, duration) {
        super();

        this.id = id;
        this.duration = duration;
        this.asset = BonusManager.assets[type];
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
