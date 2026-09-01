import { describe, expect, it } from 'vitest';
import { Body } from './Body.ts';
import { AvatarBody, type AvatarBodyOwner } from './AvatarBody.ts';
import { Island } from './Island.ts';
import { World } from './World.ts';

describe('Island', () => {
  const island = () => new Island('0:0', 40, 0, 0);

  it('bodiesTouch when circles overlap and match() allows it', () => {
    const isl = island();
    expect(isl.bodiesTouch(new Body(0, 0, 1), new Body(1.5, 0, 1))).toBe(true); // d=1.5 < 2
    expect(isl.bodiesTouch(new Body(0, 0, 1), new Body(3, 0, 1))).toBe(false); // d=3 > 2
  });

  it('bodyInBound respects the radius', () => {
    const isl = island();
    expect(isl.bodyInBound(new Body(-0.5, 20, 1), 0, 0, 40, 40)).toBe(true); // edge overlaps
    expect(isl.bodyInBound(new Body(-5, 20, 1), 0, 0, 40, 40)).toBe(false);
  });

  it('add/remove wires the body<->island both ways', () => {
    const isl = island();
    const b = new Body(10, 10, 1);
    isl.addBody(b);
    expect(isl.bodies.count()).toBe(1);
    expect(b.islands.count()).toBe(1);
    isl.removeBody(b);
    expect(isl.bodies.count()).toBe(0);
    expect(b.islands.count()).toBe(0);
  });
});

describe('World', () => {
  it('builds a grid sized by islandGridSize', () => {
    const w = new World(80); // round(80/40) = 2 → 2x2 = 4 islands, side 40
    expect(w.islands.count()).toBe(4);
    expect(w.islandSize).toBe(40);
    expect(w.getIslandByPoint(10, 10)!.id).toBe('0:0');
    expect(w.getIslandByPoint(50, 50)!.id).toBe('1:1');
    expect(w.getIslandByPoint(200, 0)).toBeNull();
  });

  it('addBody only while active, and spreads to the touched islands', () => {
    const w = new World(80);
    const b = new Body(40, 40, 1); // straddles all four islands
    w.addBody(b);
    expect(b.islands.count()).toBe(0); // inactive → ignored

    w.activate();
    w.addBody(b);
    expect(b.islands.count()).toBe(4);
    expect(w.getBody(new Body(40, 40, 1))).toBe(b);

    w.removeBody(b);
    expect(w.getBody(new Body(40, 40, 1))).toBeNull();
  });

  it('getBoundIntersect / getOposite at the walls', () => {
    const w = new World(80);
    expect(w.getBoundIntersect(new Body(0.5, 40, 1), 0.6)).toEqual([0, 40]);
    expect(w.getBoundIntersect(new Body(79.5, 40, 1), 0.6)).toEqual([80, 40]);
    expect(w.getBoundIntersect(new Body(40, 40, 1), 0.6)).toBeNull();
    expect(w.getOposite(0, 40)).toEqual([80, 40]);
    expect(w.getOposite(80, 40)).toEqual([0, 40]);
    expect(w.getOposite(40, 0)).toEqual([40, 80]);
  });

  it('testBody is false where a body sits, true elsewhere', () => {
    const w = new World(80);
    w.activate();
    w.addBody(new Body(20, 20, 1));
    expect(w.testBody(new Body(20, 20, 1))).toBe(false);
    expect(w.testBody(new Body(60, 60, 1))).toBe(true);
  });
});

describe('AvatarBody.match — trail latency', () => {
  const owner = (): AvatarBodyOwner & { id: string } => ({
    id: 'a',
    radius: 0.6,
    bodyCount: 0,
    trailLatency: 3,
    equal(other: unknown) {
      return (other as { id: string }).id === (this as { id: string }).id;
    },
  });

  it("an avatar's own recent points don't kill it, older ones do", () => {
    const a = owner();
    const points = Array.from({ length: 6 }, () => new AvatarBody(0, 0, a)); // num 0..5
    const head = points[5]!; // newest

    // storedPoint.match(head): head.num - storedPoint.num > trailLatency(3)
    expect(points[0]!.match(head)).toBe(true); // 5 - 0 = 5  > 3  → collide
    expect(points[1]!.match(head)).toBe(true); // 5 - 1 = 4  > 3
    expect(points[2]!.match(head)).toBe(false); // 5 - 2 = 3  !> 3 → too recent
    expect(points[4]!.match(head)).toBe(false); // 5 - 4 = 1
  });

  it('different avatars always collide', () => {
    const a = owner();
    const b = owner();
    b.id = 'b';
    const ba = new AvatarBody(0, 0, a);
    const bb = new AvatarBody(0, 0, b);
    expect(ba.match(bb)).toBe(true);
  });
});
