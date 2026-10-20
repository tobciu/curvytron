import { Mapper } from './Mapper.js';

/**
 * Touch Mapper
 */
export class TouchMapper extends Mapper {
    constructor() {
        super();

        this.onTouch = this.onTouch.bind(this);
    }

    /**
     * Start listening
     */
    start() {
        if (super.start()) {
            window.addEventListener('touchstart', this.onTouch);
            window.addEventListener('touchend', this.kill);
            window.addEventListener('touchcancel', this.kill);
            window.addEventListener('touchleave', this.kill);
        }
    }

    /**
     * Stop listening
     */
    stop() {
        if (super.stop()) {
            window.removeEventListener('touchstart', this.onTouch);
            window.removeEventListener('touchend', this.kill);
            window.removeEventListener('touchcancel', this.kill);
            window.removeEventListener('touchleave', this.kill);
        }
    }

    /**
     * On touch pressed
     *
     * @param {Event} e
     */
    onTouch(e) {
        e.preventDefault();

        this.stop();
        this.setValue(e.changedTouches[0]);

        return false;
    }

    /**
     * Gues character from Key
     *
     * @param {Number} key
     *
     * @return {String}
     */
    guessChar(key) {
        return '✍';
    }
}
