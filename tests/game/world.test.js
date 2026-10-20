import { describe, expect, it } from 'vitest';
import { World } from '../../src/server/core/World.js';
import { Body } from '../../src/server/core/Body.js';

/** A world where the bodies are taken into account, like during a game */
function createWorld(size = 100) {
    const world = new World(size);

    world.activate();

    return world;
}

describe('World', () => {
    it('detects the borders, taking the radius into account', () => {
        const world = new World(100);

        expect(world.getBoundIntersect(new Body(50, 50, 1), 1)).toBeNull();
        expect(world.getBoundIntersect(new Body(0.5, 50, 1), 1)).toEqual([0, 50]);
        expect(world.getBoundIntersect(new Body(99.5, 50, 1), 1)).toEqual([100, 50]);
        expect(world.getBoundIntersect(new Body(50, 0.5, 1), 1)).toEqual([50, 0]);
        expect(world.getBoundIntersect(new Body(50, 99.5, 1), 1)).toEqual([50, 100]);
        // Without margin only the center counts
        expect(world.getBoundIntersect(new Body(0.5, 50, 1), 0)).toBeNull();
        expect(world.getBoundIntersect(new Body(-0.1, 50, 1), 0)).toEqual([0, 50]);
    });

    it('wraps around to the opposite border', () => {
        const world = new World(100);

        expect(world.getOposite(0, 30)).toEqual([100, 30]);
        expect(world.getOposite(100, 30)).toEqual([0, 30]);
        expect(world.getOposite(30, 0)).toEqual([30, 100]);
        expect(world.getOposite(30, 100)).toEqual([30, 0]);
    });

    it('finds the body an other body touches', () => {
        const world = createWorld();
        const wall = new Body(40, 40, 2, 'wall');

        world.addBody(wall);

        expect(world.getBody(new Body(41, 41, 1))).toBe(wall);
        expect(world.getBody(new Body(60, 60, 1))).toBeNull();
        expect(world.getBody(new Body(43.5, 40, 1))).toBeNull();
        expect(world.getBody(new Body(42.9, 40, 1))).toBe(wall);
    });

    it('finds bodies that sit in the neighbour island', () => {
        const world = createWorld();
        const wall = new Body(world.islandSize - 0.2, 10, 1);

        world.addBody(wall);

        expect(world.getBody(new Body(world.islandSize + 0.5, 10, 1))).toBe(wall);
    });

    it('forgets a removed body, and every body once cleared', () => {
        const world = createWorld();
        const wall = new Body(40, 40, 2);

        world.addBody(wall);
        world.removeBody(wall);

        expect(world.getBody(new Body(40, 40, 1))).toBeNull();

        world.addBody(new Body(40, 40, 2));
        world.clear();

        expect(world.getBody(new Body(40, 40, 1))).toBeNull();
    });

    it('ignores the bodies that do not match', () => {
        const world = createWorld();
        const ghost = new Body(40, 40, 2);

        ghost.match = () => false;
        world.addBody(ghost);

        expect(world.getBody(new Body(40, 40, 1))).toBeNull();
    });

    it('picks a random position away from the borders', () => {
        const world = new World(100);

        for (let i = 0; i < 200; i++) {
            const [x, y] = world.getRandomPosition(0.6, 0.05);

            expect(x).toBeGreaterThanOrEqual(5.6);
            expect(x).toBeLessThanOrEqual(94.4);
            expect(y).toBeGreaterThanOrEqual(5.6);
            expect(y).toBeLessThanOrEqual(94.4);
        }
    });

    it('does not accept a direction that leads into a border too soon', () => {
        const world = new World(100);

        // 2 units from the left border, the margin is 30 units
        expect(world.isDirectionValid(Math.PI, 2, 50, 30)).toBe(false);
        expect(world.isDirectionValid(0, 2, 50, 30)).toBe(true);
        expect(world.isDirectionValid(Math.PI * 1.5, 50, 98, 30)).toBe(true);
        expect(world.isDirectionValid(Math.PI / 2, 50, 98, 30)).toBe(false);
    });

    it('only picks accepted directions', () => {
        const world = new World(100);

        for (let i = 0; i < 100; i++) {
            expect(world.isDirectionValid(world.getRandomDirection(2, 50, 0.3), 2, 50, 30)).toBe(true);
        }
    });
});
