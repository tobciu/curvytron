import { describe, expect, it } from 'vitest';
import { BaseAvatar, type AvatarPlayer } from './BaseAvatar.ts';
import { BasePlayer } from './BasePlayer.ts';

const player = (over: Partial<AvatarPlayer> = {}): AvatarPlayer => ({
  id: 1,
  name: 'p',
  color: '#5cae24',
  ...over,
});

describe('BaseAvatar', () => {
  it('constructs with defaults and a trail + bonus stack', () => {
    const a = new BaseAvatar(player());
    expect(a.velocity).toBe(BaseAvatar.velocity);
    expect(a.radius).toBe(BaseAvatar.radius);
    expect(a.alive).toBe(true);
    expect(a.borderColor).toBe('#5cae24');
    expect(a.trail).toBeDefined();
    expect(a.bonusStack).toBeDefined();
  });

  it('updateVelocities projects speed onto the heading', () => {
    const a = new BaseAvatar(player());
    a.angle = 0;
    a.updateVelocities();
    expect(a.velocityX).toBeCloseTo(16 / 1000, 6);
    expect(a.velocityY).toBeCloseTo(0, 6);

    a.setAngle(Math.PI / 2); // setAngle triggers updateVelocities
    expect(a.velocityX).toBeCloseTo(0, 6);
    expect(a.velocityY).toBeCloseTo(16 / 1000, 6);
  });

  it('setVelocity floors at half the base speed', () => {
    const a = new BaseAvatar(player());
    a.setVelocity(2);
    expect(a.velocity).toBe(8); // BaseAvatar.velocity / 2
    a.setVelocity(24);
    expect(a.velocity).toBe(24);
  });

  it('slower avatars carve a tighter turn radius (speed↔turn coupling)', () => {
    const a = new BaseAvatar(player());
    a.updateVelocities();
    a.updateAngularVelocity(1);
    const fullRadius = Math.abs(a.velocity / a.angularVelocity);

    a.setVelocity(8); // half speed
    a.updateAngularVelocity(1);
    const halfRadius = Math.abs(a.velocity / a.angularVelocity);

    // angularVelocityBase drops at half speed (ratio 0.5 → 0.5*base + ln(2)/1000)
    expect(a.angularVelocityBase).toBeLessThan(BaseAvatar.angularVelocityBase);
    // but speed drops faster, so the visible turn circle is smaller
    expect(halfRadius).toBeLessThan(fullRadius);
  });

  it('setRadius floors at radius/8', () => {
    const a = new BaseAvatar(player());
    a.setRadius(0.0001);
    expect(a.radius).toBeCloseTo(BaseAvatar.radius / 8, 6);
  });

  it('updateAngle: continuous while directionInLoop, single-step otherwise', () => {
    const a = new BaseAvatar(player());
    a.setAngularVelocity(0.01);
    a.updateAngle(10);
    expect(a.angle).toBeCloseTo(0.1, 6); // 0.01 * 10

    const b = new BaseAvatar(player());
    b.directionInLoop = false;
    b.setAngularVelocity(0.5);
    b.updateAngle(10);
    expect(b.angle).toBeCloseTo(0.5, 6); // one fixed step, ignores dt
  });

  it('inverse flips the input-driven turn direction (not an already-set one)', () => {
    const normal = new BaseAvatar(player());
    normal.updateAngularVelocity(1);
    const forward = normal.angularVelocity;

    const inv = new BaseAvatar(player());
    inv.setInverse(true);
    inv.updateAngularVelocity(1); // same input key
    expect(Math.sign(inv.angularVelocity)).toBe(-Math.sign(forward));

    // legacy quirk: setInverse on an avatar that is already turning does NOT
    // flip the current angularVelocity, it recomputes to the same value
    const mid = new BaseAvatar(player());
    mid.updateAngularVelocity(1);
    const before = mid.angularVelocity;
    mid.setInverse(true);
    expect(mid.angularVelocity).toBe(before);
  });

  it('scoring: addScore accumulates roundScore, resolveScore folds it in', () => {
    const a = new BaseAvatar(player());
    a.addScore(2);
    a.addScore(3);
    expect(a.roundScore).toBe(5);
    expect(a.score).toBe(0);
    a.resolveScore();
    expect(a.score).toBe(5);
    expect(a.roundScore).toBe(0);
  });

  it('die() stops the avatar and drops a final point', () => {
    const a = new BaseAvatar(player());
    a.setPosition(3, 4);
    a.die();
    expect(a.alive).toBe(false);
    expect(a.trail.points).toContainEqual([3, 4]);
  });

  it('clear() restores defaults and spawns at the current radius', () => {
    const a = new BaseAvatar(player());
    a.setVelocity(24);
    a.setInverse(true);
    a.score = 7;
    a.clear();
    expect(a.velocity).toBe(BaseAvatar.velocity);
    expect(a.inverse).toBe(false);
    expect(a.score).toBe(7); // score survives; roundScore does not
    expect(a.x).toBe(BaseAvatar.radius);
  });

  it('serialize exposes id/name/color/borderColor/score', () => {
    const a = new BaseAvatar(player());
    a.score = 9;
    expect(a.serialize()).toEqual({
      id: 1,
      name: 'p',
      color: '#5cae24',
      borderColor: '#5cae24',
      score: 9,
    });
  });
});

describe('BasePlayer', () => {
  const client = { id: 'c1' };

  it('validateColor: #rrggbb, plus a YIQ brightness gate', () => {
    const p = new BasePlayer(client, 'p');
    expect(p.validateColor('#ffffff')).toBe(true);
    expect(p.validateColor('nope')).toBe(false);
    expect(p.validateColor('#fff')).toBe(false);
    expect(p.validateColor('#ffffff', true)).toBe(true); // bright
    expect(p.validateColor('#000000', true)).toBe(false); // too dark
  });

  it('constructor accepts any #rrggbb (no YIQ gate); a random colour when omitted is bright', () => {
    expect(new BasePlayer(client, 'p', '#5cae24').color).toBe('#5cae24');
    // legacy quirk: the ctor validates without the YIQ flag, so a too-dark
    // colour is kept as-is — only setColor() enforces brightness.
    expect(new BasePlayer(client, 'p', '#000000').color).toBe('#000000');
    // no colour supplied → generated, and generation does apply YIQ
    const generated = new BasePlayer(client, 'p').color;
    expect(generated).toMatch(/^#[0-9a-f]{4,6}$/);
    expect(new BasePlayer(client, 'p').validateColor(generated, true)).toBe(true);
  });

  it('setColor rejects invalid / too-dark colours', () => {
    const p = new BasePlayer(client, 'p', '#5cae24');
    expect(p.setColor('#000000')).toBe(false);
    expect(p.color).toBe('#5cae24');
    expect(p.setColor('#abcdef')).toBe(true);
    expect(p.color).toBe('#abcdef');
  });

  it('toggleReady flips or sets explicitly', () => {
    const p = new BasePlayer(client, 'p');
    expect(p.ready).toBe(false);
    p.toggleReady();
    expect(p.ready).toBe(true);
    p.toggleReady(false);
    expect(p.ready).toBe(false);
  });

  it('getAvatar caches and uses the injected Avatar class', () => {
    class MyAvatar extends BaseAvatar {
      marker = true;
    }
    class MyPlayer extends BasePlayer {
      static override AvatarClass = MyAvatar;
      constructor() {
        super(client, 'p', '#5cae24');
        this.id = 42;
      }
    }
    const p = new MyPlayer();
    const av = p.getAvatar();
    expect(av).toBeInstanceOf(MyAvatar);
    expect(p.getAvatar()).toBe(av); // cached
  });

  it('reset destroys the avatar and clears ready', () => {
    const p = new BasePlayer(client, 'p', '#5cae24');
    p.id = 1;
    const av = p.getAvatar();
    p.ready = true;
    p.reset();
    expect(p.avatar).toBeNull();
    expect(p.ready).toBe(false);
    expect(av.present).toBe(false);
  });

  it('serialize flattens client id + fields', () => {
    const p = new BasePlayer(client, 'Ann', '#5cae24');
    p.id = 3;
    expect(p.serialize()).toEqual({
      client: 'c1',
      id: 3,
      name: 'Ann',
      color: '#5cae24',
      ready: false,
    });
  });
});
