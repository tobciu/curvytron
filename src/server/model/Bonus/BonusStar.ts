import { Bonus } from './Bonus.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * Star: no effect, the mode gives points to whoever catches it (see `StarChaseMode`). It is small, shows up at risky
 * places and goes away after its lifetime (`StarSpawner`).
 */
export class BonusStar extends Bonus {
    override duration: number = 0;

    /** Timer that takes the star off the map */
    expiry: ReturnType<typeof setTimeout> | null = null;

    constructor(x: number, y: number) {
        super(x, y);
    }

    getTarget(avatar: Avatar) {
        return [avatar];
    }

    on() {}

    off() {}

    /** The star was caught or removed: it does not expire any more */
    override clear() {
        if (this.expiry) {
            clearTimeout(this.expiry);
            this.expiry = null;
        }

        super.clear();
    }
}
