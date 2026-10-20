import { afterEach, describe, expect, it } from 'vitest';
import { BaseAvatar } from '../../src/shared/model/BaseAvatar.js';
import { createGame, place } from '../helpers/game.js';

let game;

afterEach(() => game?.avatars?.items.forEach((avatar) => avatar.printManager.stop()));

function avatars(names) {
    ({ game } = createGame(names));

    return game.avatars.items;
}

describe('Avatar', () => {
    it('starts a round with the default properties', () => {
        const [avatar] = avatars(['Alice', 'Bob']);

        expect(avatar.velocity).toBe(16);
        expect(avatar.radius).toBe(0.6);
        expect(avatar.angularVelocityBase).toBeCloseTo(0.0028);
        expect(avatar.inverse).toBe(false);
        expect(avatar.invincible).toBe(false);
        expect(avatar.ghost).toBe(false);
        expect(avatar.directionInLoop).toBe(true);
        expect(avatar.alive).toBe(true);
        expect(avatar.score).toBe(0);
    });

    it('moves in the direction it faces, 16 units per second', () => {
        const [avatar] = avatars();

        place(avatar, 10, 10, 0);
        avatar.update(1000);

        expect(avatar.x).toBeCloseTo(26);
        expect(avatar.y).toBeCloseTo(10);

        place(avatar, 10, 10, Math.PI / 2);
        avatar.update(500);

        expect(avatar.x).toBeCloseTo(10);
        expect(avatar.y).toBeCloseTo(18);
    });

    it('moves when it faces exactly to the right, as it does after a reset', () => {
        const [avatar] = avatars();

        place(avatar, 10, 10, 0);
        avatar.update(1000);

        expect(avatar.x).toBeCloseTo(26);
    });

    it('does not move once dead', () => {
        const [avatar] = avatars();

        place(avatar, 10, 10);
        avatar.die();
        avatar.update(1000);

        expect(avatar.x).toBe(10);
    });

    it('turns while a direction is pressed, the other way when inverted', () => {
        const [avatar] = avatars();

        place(avatar, 10, 10, 0);
        avatar.updateAngularVelocity(1);
        avatar.update(100);

        expect(avatar.angle).toBeCloseTo(0.0028 * 100);

        place(avatar, 10, 10, 0);
        avatar.setInverse(true);
        avatar.updateAngularVelocity(1);
        avatar.update(100);

        expect(avatar.angle).toBeCloseTo(-0.0028 * 100 * -1 * -1);
        expect(avatar.angle).toBeLessThan(0);
    });

    it('can not be slower than half the normal speed, nor smaller than an eighth of the radius', () => {
        const [avatar] = avatars();

        avatar.setVelocity(1);
        avatar.setRadius(0.001);

        expect(avatar.velocity).toBe(8);
        expect(avatar.radius).toBeCloseTo(0.075);
    });

    it('moves its collision body with it', () => {
        const [avatar] = avatars();

        avatar.setPosition(4, 5);
        avatar.setRadius(1.2);

        expect(avatar.body.x).toBe(4);
        expect(avatar.body.y).toBe(5);
        expect(avatar.body.radius).toBe(1.2);
    });

    it('announces what changes', () => {
        const [avatar] = avatars();
        const events = [];

        avatar.on('property', (data) => events.push([data.property, data.value]));
        avatar.setVelocity(24);
        avatar.setRadius(1.2);
        avatar.setInverse(true);
        avatar.setInvincible(true);
        avatar.setGhost(true);

        expect(events).toEqual([
            ['velocity', 24],
            ['radius', 1.2],
            ['inverse', true],
            ['invincible', true],
            ['ghost', true]
        ]);
    });

    it('is independent of the other avatars and of the defaults', () => {
        const [first, second] = avatars();

        first.setVelocity(40);
        first.setRadius(2);
        first.setInverse(true);

        expect(second.velocity).toBe(16);
        expect(second.radius).toBe(0.6);
        expect(second.inverse).toBe(false);
        expect(BaseAvatar.defaults.velocity).toBe(16);
        expect(BaseAvatar.defaults.radius).toBe(0.6);
        expect(BaseAvatar.defaults.inverse).toBe(false);
    });

    it('goes back to the defaults on a new round', () => {
        const [avatar] = avatars();

        avatar.setVelocity(40);
        avatar.setRadius(2);
        avatar.setInverse(true);
        avatar.setInvincible(true);
        avatar.setGhost(true);
        avatar.die();
        avatar.clear();

        expect(avatar.velocity).toBe(16);
        expect(avatar.radius).toBe(0.6);
        expect(avatar.inverse).toBe(false);
        expect(avatar.invincible).toBe(false);
        expect(avatar.ghost).toBe(false);
        expect(avatar.alive).toBe(true);
    });

    it('dies once, announcing its killer, and loses its bonuses', () => {
        const [avatar, killer] = avatars();
        const deaths = [];

        avatar.on('die', (data) => deaths.push(data));
        avatar.die({ data: killer, isOld: () => true });

        expect(avatar.alive).toBe(false);
        expect(deaths).toEqual([{ avatar, killer, old: true }]);
        expect(avatar.bonusStack.bonuses.isEmpty()).toBe(true);
    });

    it('keeps the round score apart from the score until the round is resolved', () => {
        const [avatar] = avatars();

        avatar.addScore(2);
        avatar.addScore(1);

        expect(avatar.roundScore).toBe(3);
        expect(avatar.score).toBe(0);

        avatar.resolveScore();
        avatar.resolveScore();

        expect(avatar.score).toBe(3);
        expect(avatar.roundScore).toBe(0);
    });

    it('draws its trail only while printing, and forgets it afterwards', () => {
        const [avatar] = avatars();
        const points = [];

        avatar.on('point', ({ x, y }) => points.push([x, y]));
        place(avatar, 10, 10);
        avatar.setPrinting(true);
        avatar.update(1000);
        avatar.setPrinting(false);

        expect(points.length).toBeGreaterThan(2);
        expect(points[0]).toEqual([10, 10]);
        expect(avatar.trail.lastX).toBeNull();
    });
});
