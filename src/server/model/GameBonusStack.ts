import { BaseBonusStack } from '../../shared/model/BaseBonusStack.ts';
import type { Bonus } from './Bonus/Bonus.ts';

/**
 * Game Bonus Stack
 */
export class GameBonusStack extends BaseBonusStack {
    constructor(game: any) {
        super(game);
    }

    /**
     * Add bonus to the stack
     */
    override add(bonus: Bonus) {
        super.add(bonus);
    }

    /**
     * Remove bonus from the stack
     */
    override remove(bonus: Bonus) {
        super.remove(bonus);
    }

    /**
     * Apply the value to target's property
     */
    override apply(property: string, value: number) {
        if (property === 'borderless') {
            this.target.setBorderless(!!value);
        } else {
            super.apply(property, value);
        }
    }
}
