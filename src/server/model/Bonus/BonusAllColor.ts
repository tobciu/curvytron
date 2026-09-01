import { BonusAll } from './BonusAll.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

/** Rotates every avatar's colour by one — visual confusion for the whole game. */
export class BonusAllColor extends BonusAll {
  override duration = 7500;

  private avatars: Array<string | number> = [];
  private colors: string[] = [];

  override getTarget(avatar: any, game: any): any {
    const targets = super.getTarget(avatar, game) as any[];

    this.avatars = new Array(targets.length);
    this.colors = new Array(targets.length);

    for (let i = targets.length - 1; i >= 0; i--) {
      this.avatars[i] = targets[i].id;
      this.colors[i] = targets[i].color;
    }

    return targets;
  }

  getEffects(avatar: any): BonusEffect[] {
    return [['color', this.getColor(avatar)]];
  }

  getColor(avatar: any): string {
    const index = this.avatars.indexOf(avatar.id);
    return this.colors[(index + 1) % this.colors.length]!;
  }
}
