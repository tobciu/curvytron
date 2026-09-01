import { BaseBonusManager, type ManagedBonus } from '@shared/manager/BaseBonusManager.ts';
import { BaseBonus } from '@shared/model/BaseBonus.ts';
import { World } from '../core/World.ts';
import { Body } from '../core/Body.ts';

/** A concrete server bonus class (has a `body` and an effect lifecycle). */
export interface ServerBonusClass {
  new (x: number, y: number): ManagedBonus & {
    body: Body;
    applyTo(avatar: any, game: any): void;
  };
  getProbability(game: any): number;
}

/**
 * Spawns bonuses on a timer while a round is live: weighted-random type
 * selection, free-position search, and pickup tests.
 */
export class BonusManager extends BaseBonusManager {
  private ownWorld: World;
  private popingTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly bonusTypes: ServerBonusClass[];
  private readonly bonusPopingTime: number;

  constructor(game: any, bonuses: ServerBonusClass[], rate: number) {
    super(game);

    this.ownWorld = new World(game.size, 1);
    this.bonusTypes = bonuses;
    this.bonusPopingTime =
      BaseBonusManager.bonusPopingTime - (BaseBonusManager.bonusPopingTime / 2) * rate;

    this.popBonus = this.popBonus.bind(this);
  }

  override start(): void {
    super.start();
    this.ownWorld.activate();

    if (this.bonusTypes.length) {
      this.popingTimeout = setTimeout(this.popBonus, this.getRandomPopingTime());
    }
  }

  override stop(): void {
    if (this.popingTimeout) {
      clearTimeout(this.popingTimeout);
      this.popingTimeout = null;
    }
    super.stop();
  }

  override clear(): void {
    this.ownWorld.clear();
    super.clear();
  }

  popBonus(): void {
    if (!this.bonusTypes.length) {
      return;
    }

    this.popingTimeout = setTimeout(this.popBonus, this.getRandomPopingTime());

    if (this.bonuses.count() < BaseBonusManager.bonusCap) {
      const bonusType = this.getRandomBonusType();
      if (bonusType) {
        const [x, y] = this.getRandomPosition(BaseBonus.radius, BaseBonusManager.bonusPopingMargin);
        this.add(new bonusType(x, y));
      }
    }
  }

  getRandomPosition(radius: number, border: number): [number, number] {
    const g = this.game as any;
    const margin = radius + border * g.world.size;
    const body = new Body(g.world.getRandomPoint(margin), g.world.getRandomPoint(margin), margin);

    while (!g.world.testBody(body) || !this.ownWorld.testBody(body)) {
      body.x = g.world.getRandomPoint(margin);
      body.y = g.world.getRandomPoint(margin);
    }

    return [body.x, body.y];
  }

  testCatch(avatar: any): void {
    if (avatar.body) {
      const body = this.ownWorld.getBody(avatar.body);
      const bonus = body ? (body.data as any) : null;

      if (bonus && this.remove(bonus)) {
        bonus.applyTo(avatar, this.game);
      }
    }
  }

  override add(bonus: ManagedBonus & { body: Body }): boolean {
    if (super.add(bonus)) {
      this.ownWorld.addBody(bonus.body);
      this.emit('bonus:pop', bonus);
      return true;
    }
    return false;
  }

  override remove(bonus: ManagedBonus & { body: Body }): boolean {
    if (super.remove(bonus)) {
      this.ownWorld.removeBody(bonus.body);
      this.emit('bonus:clear', bonus);
      return true;
    }
    return false;
  }

  getRandomPopingTime(): number {
    return this.bonusPopingTime * (1 + Math.random());
  }

  getRandomBonusType(): ServerBonusClass | null {
    if (!this.bonusTypes.length) {
      return null;
    }

    const total = this.bonusTypes.length;
    const pot: number[] = [];
    const bonuses: ServerBonusClass[] = [];

    for (let i = 0; i < total; i++) {
      const bonusType = this.bonusTypes[i]!;
      const probability = bonusType.getProbability(this.game);

      if (probability > 0) {
        bonuses.push(bonusType);
        pot.push(probability + (i > 0 ? pot[pot.length - 1]! : 0));
      }
    }

    if (!pot.length) {
      return null;
    }

    const value = Math.random() * pot[pot.length - 1]!;

    for (let i = 0; i < pot.length; i++) {
      if (value < pot[i]!) {
        return bonuses[i]!;
      }
    }

    return null;
  }

  setSize(): void {
    this.ownWorld.clear();
    this.ownWorld = new World((this.game as any).size, 1);
  }
}
