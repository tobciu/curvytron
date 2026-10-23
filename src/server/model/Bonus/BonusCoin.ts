import { Bonus } from './Bonus.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * A coin of the coin mission: no effect, `GameStats` adds its value (see `coinValue`) to whoever catches it. It stays
 * until somebody catches it or the round is over (`CoinSpawner`).
 */
export class BonusCoin extends Bonus {
    override duration: number = 0;

    getTarget(avatar: Avatar) {
        return [avatar];
    }

    on() {
        // No effect: the mode gives the points
    }

    off() {
        // No effect to take back
    }
}
