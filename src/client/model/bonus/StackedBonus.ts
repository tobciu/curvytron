import { EventEmitter } from '#event-emitter';
import { BonusManager } from '../../manager/BonusManager.ts';

/**
 * Stacked Bonus (for display in avatar's bonus stack)
 */
export class StackedBonus extends EventEmitter {
    id: any;
    duration: any;
    asset: any;
    changed: boolean;
    timeout: any;

    /**
     * Assets
     */
    /**
     * Opacity
     */
    opacity: number = 1;

    constructor(id: any, type: any, duration: any) {
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
     */
    setEndingTimeout(warning: number) {
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
