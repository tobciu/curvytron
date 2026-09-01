import { describe, expect, it, vi } from 'vitest';
import { BaseTrail, type TrailOwner } from './BaseTrail.ts';
import { Trail as ServerTrail } from '../../server/model/Trail.ts';
import { Trail as ClientTrail } from '../../client/model/Trail.ts';

const owner = (): TrailOwner => ({ color: '#abcdef', radius: 0.6 });

describe('BaseTrail', () => {
  it('takes colour and radius from its owner', () => {
    const t = new BaseTrail(owner());
    expect(t.color).toBe('#abcdef');
    expect(t.radius).toBe(0.6);
    expect(t.points).toEqual([]);
  });

  it('addPoint records the point and last position; clear resets', () => {
    const t = new BaseTrail(owner());
    t.addPoint(1, 2);
    t.addPoint(3, 4);
    expect(t.points).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect([t.lastX, t.lastY]).toEqual([3, 4]);
    t.clear();
    expect(t.points).toEqual([]);
    expect([t.lastX, t.lastY]).toEqual([null, null]);
  });
});

describe('server Trail', () => {
  it('emits "clear" with the owner', () => {
    const o = owner();
    const t = new ServerTrail(o);
    const spy = vi.fn();
    t.on('clear', spy);
    t.addPoint(1, 1);
    t.clear();
    expect(spy).toHaveBeenCalledWith({ avatar: o });
    expect(t.points).toEqual([]);
  });
});

describe('client Trail', () => {
  it('clear() only marks; getLastSegment applies it', () => {
    const t = new ClientTrail(owner());
    t.addPoint(0, 0);
    t.addPoint(1, 1);
    t.clear();
    expect(t.clearAsked).toBe(true);
    expect(t.points).toEqual([
      [0, 0],
      [1, 1],
    ]);

    const seg = t.getLastSegment();
    expect(seg).toEqual([
      [0, 0],
      [1, 1],
    ]);
    expect(t.points).toEqual([]);
    expect(t.clearAsked).toBe(false);
  });

  it('a jump larger than tolerance queues a fresh segment start', () => {
    const t = new ClientTrail(owner());
    t.addPoint(0, 0);
    t.addPoint(10, 0); // jump > tolerance(1) → clear + queue
    expect(t.clearAsked).toBe(true);
    expect(t.queueX).toBe(10);

    t.getLastSegment(); // applies clear, then re-adds the queued point
    expect(t.points).toEqual([[10, 0]]);
  });

  it('small steps append normally, trimming to the last point', () => {
    const t = new ClientTrail(owner());
    t.addPoint(0, 0);
    t.addPoint(0.5, 0.5);
    t.addPoint(1, 1);
    const seg = t.getLastSegment();
    expect(seg).toHaveLength(3);
    expect(t.points).toEqual([[1, 1]]); // buffer trimmed to last
  });
});
