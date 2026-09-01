import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseAvatar } from '@shared/model/BaseAvatar.ts';
import { BaseBonus } from '@shared/model/BaseBonus.ts';
import { Bonus } from './Bonus.ts';
import { BonusSelf } from './BonusSelf.ts';
import { BonusSelfFast } from './BonusSelfFast.ts';
import { BonusSelfSlow } from './BonusSelfSlow.ts';
import { BonusSelfMaster } from './BonusSelfMaster.ts';
import { BonusEnemyBig } from './BonusEnemyBig.ts';
import { BonusEnemyStraightAngle } from './BonusEnemyStraightAngle.ts';
import { BonusGameBorderless } from './BonusGameBorderless.ts';
import { BonusGameClear } from './BonusGameClear.ts';
import { BonusLeader } from './BonusLeader.ts';

describe('bonus classes', () => {
  it('BaseBonus defaults; Bonus carries a collision body', () => {
    const b = new Bonus(10, 20);
    expect([b.x, b.y]).toEqual([10, 20]);
    expect(b.radius).toBe(BaseBonus.radius);
    expect(b.duration).toBe(5000);
    expect(b.body.radius).toBe(3);
    expect(b.body.data).toBe(b);
  });

  it('effect tables match the design', () => {
    expect(new BonusSelfFast(0, 0).getEffects(null)).toEqual([['velocity', 0.75 * BaseAvatar.velocity]]);
    expect(new BonusSelfSlow(0, 0).getEffects(null)).toEqual([['velocity', -BaseAvatar.velocity / 2]]);
    expect(new BonusSelfFast(0, 0).duration).toBe(4000);
    expect(new BonusSelfMaster(0, 0).getEffects(null)).toEqual([
      ['invincible', true],
      ['printing', -1],
    ]);
    expect(new BonusEnemyBig(0, 0).getEffects(null)).toEqual([['radius', 1]]);
    expect(new BonusEnemyStraightAngle(0, 0).getEffects(null)).toEqual([
      ['directionInLoop', false],
      ['angularVelocityBase', Math.PI / 2],
    ]);
    expect(new BonusGameBorderless(0, 0).getEffects(null)).toEqual([['borderless', true]]);
  });

  describe('applyTo lifecycle', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('BonusSelf: adds itself to the avatar stack, removes on timeout', () => {
      const stack = { add: vi.fn(), remove: vi.fn() };
      const avatar = { alive: true, bonusStack: stack };
      const b = new BonusSelf(0, 0);
      b.duration = 1000;

      b.applyTo(avatar, {});
      expect(stack.add).toHaveBeenCalledWith(b);
      expect(stack.remove).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(stack.remove).toHaveBeenCalledWith(b);
    });

    it('BonusSelf: a dead avatar is not targeted', () => {
      const stack = { add: vi.fn(), remove: vi.fn() };
      const b = new BonusSelf(0, 0);
      b.applyTo({ alive: false, bonusStack: stack }, {});
      expect(stack.add).not.toHaveBeenCalled();
    });

    it('BonusGameClear: wipes trails immediately, no timeout (duration 0)', () => {
      const game = { clearTrails: vi.fn() };
      const b = new BonusGameClear(0, 0);
      expect(b.duration).toBe(0);
      b.applyTo(null, game);
      expect(game.clearTrails).toHaveBeenCalledOnce();
    });
  });

  describe('spawn weight (static getProbability)', () => {
    it('BaseBonus default is 1; fixed overrides return their constant', () => {
      expect(BaseBonus.getProbability({})).toBe(1);
      expect(BonusGameBorderless.getProbability({})).toBe(0.8);
      expect(BonusEnemyStraightAngle.getProbability({})).toBe(0.6);
    });

    it('BonusLeader: 0 unless there is a leader with score > 0', () => {
      const game = (scores: number[]) => ({
        avatars: {
          filter: () => ({
            // sortAvatars returns this same shape; getFirst = highest score
            getFirst: () => (scores.length ? { score: Math.max(...scores) } : null),
          }),
        },
        sortAvatars: (c: unknown) => c,
      });
      expect(BonusLeader.getProbability(game([]))).toBe(0);
      expect(BonusLeader.getProbability(game([0, 0]))).toBe(0);
      expect(BonusLeader.getProbability(game([5, 2]))).toBe(BonusLeader.probability);
    });

    it('BonusGameClear: likelier the more players are dead', () => {
      const game = (alive: number, present: number) => ({
        getAliveAvatars: () => ({ count: () => alive }),
        getPresentAvatars: () => ({ count: () => present }),
      });
      expect(BonusGameClear.getProbability(game(4, 4))).toBe(0); // all alive
      expect(BonusGameClear.getProbability(game(2, 4))).toBe(0.5);
      expect(BonusGameClear.getProbability(game(1, 4))).toBeCloseTo(0.8, 5);
    });
  });
});
