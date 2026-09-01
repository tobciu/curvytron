import { describe, expect, it } from 'vitest';
import { BaseBonusStack, type StackableBonus } from './BaseBonusStack.ts';

let nextId = 1;
const bonus = (effects: Array<[string, number]>): StackableBonus => ({
  id: nextId++,
  getEffects: () => effects,
});

describe('BaseBonusStack', () => {
  it('sums the effects of stacked bonuses onto the target', () => {
    const target: Record<string, number> = {};
    const stack = new BaseBonusStack(target);

    stack.add(bonus([['velocity', 5]]));
    expect(target.velocity).toBe(5); // 0 default + 5

    stack.add(bonus([['velocity', 3]]));
    expect(target.velocity).toBe(8); // 0 + 5 + 3
  });

  it('recomputes from scratch on remove, resetting to the default', () => {
    const target: Record<string, number> = {};
    const stack = new BaseBonusStack(target);
    const a = bonus([['radius', 2]]);
    const b = bonus([['radius', 4]]);

    stack.add(a);
    stack.add(b);
    expect(target.radius).toBe(6);

    stack.remove(a);
    expect(target.radius).toBe(4); // recomputed: default(0) + b only

    stack.remove(b);
    expect(target.radius).toBe(0); // back to default
  });

  it('handles multiple properties from one bonus', () => {
    const target: Record<string, number> = {};
    const stack = new BaseBonusStack(target);
    stack.add(bonus([
      ['velocity', 10],
      ['radius', 1],
    ]));
    expect(target).toEqual({ velocity: 10, radius: 1 });
  });

  it('clear empties the collection (but leaves the last applied values)', () => {
    const target: Record<string, number> = {};
    const stack = new BaseBonusStack(target);
    stack.add(bonus([['velocity', 5]]));
    stack.clear();
    expect(stack.bonuses.count()).toBe(0);
  });

  it('adding the same bonus twice is a no-op', () => {
    const target: Record<string, number> = {};
    const stack = new BaseBonusStack(target);
    const a = bonus([['velocity', 5]]);
    stack.add(a);
    stack.add(a);
    expect(target.velocity).toBe(5);
    expect(stack.bonuses.count()).toBe(1);
  });
});
