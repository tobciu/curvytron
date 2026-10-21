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
            globalThis.addEventListener('touchstart', this.onTouch);
            globalThis.addEventListener('touchend', this.kill);
            globalThis.addEventListener('touchcancel', this.kill);
            globalThis.addEventListener('touchleave', this.kill);

            return true;
        }

        return false;
    }

    /**
     * Stop listening
     */
    override stop(): boolean {
        if (super.stop()) {
            globalThis.removeEventListener('touchstart', this.onTouch);
            globalThis.removeEventListener('touchend', this.kill);
            globalThis.removeEventListener('touchcancel', this.kill);
            globalThis.removeEventListener('touchleave', this.kill);

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
