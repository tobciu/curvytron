import { Mapper } from './Mapper.ts';

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
    override start(): boolean {
        if (super.start()) {
            window.addEventListener('touchstart', this.onTouch);
            window.addEventListener('touchend', this.kill);
            window.addEventListener('touchcancel', this.kill);
            window.addEventListener('touchleave', this.kill);

            return true;
        }

        return false;
    }

    /**
     * Stop listening
     */
    override stop(): boolean {
        if (super.stop()) {
            window.removeEventListener('touchstart', this.onTouch);
            window.removeEventListener('touchend', this.kill);
            window.removeEventListener('touchcancel', this.kill);
            window.removeEventListener('touchleave', this.kill);

            return true;
        }

        return false;
    }

    /**
     * On touch pressed
     */
    onTouch(e: any) {
        e.preventDefault();

        this.stop();
        this.setValue(e.changedTouches[0]);

        return false;
    }

    /**
     * Gues character from Key
     */
    override guessChar(key: any): string {
        return '✍';
    }
}
