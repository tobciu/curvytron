import { BaseBonusStack, type BonusEffectValue } from '@shared/model/BaseBonusStack.ts';

/** The game's own bonus stack — routes `borderless` to the game. */
export class GameBonusStack extends BaseBonusStack<any> {
  override apply(property: string, value: BonusEffectValue): void {
    if (property === 'borderless') {
      this.target.setBorderless(value ? true : false);
    } else {
      super.apply(property, value);
    }
  }
}
