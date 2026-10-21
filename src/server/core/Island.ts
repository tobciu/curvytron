import { Collection } from '../../shared/Collection.ts';
import type { Body } from './Body.ts';

/**
 * Island
 */
export class Island {
    id: string;
    size: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    bodies: Collection;

    constructor(id: string, size: number, x: number, y: number) {
        this.id = id;
        this.size = size;
        this.fromX = x;
        this.fromY = y;
        this.toX = x + size;
        this.toY = y + size;
        this.bodies = new Collection([], 'id');
    }

    /**
     * Add a body
     */
    addBody(body: Body) {
        if (this.bodies.add(body)) {
            body.islands.add(this);
        }
    }

    /**
     * Remove a body
     */
    removeBody(body: Body) {
        this.bodies.remove(body);
        body.islands.remove(this);
    }

    /**
     * Test if the given body position is free (doesn't collide with any other)
     */
    testBody(body: Body): boolean {
        return this.getBody(body) === null;
    }

    /**
     * Get collinding body for the given body
     */
    getBody(body: Body) {
        if (this.bodyInBound(body, this.fromX, this.fromY, this.toX, this.toY)) {
            for (let i = this.bodies.items.length - 1; i >= 0; i--) {
                if (this.bodiesTouch(this.bodies.items[i], body)) {
                    return this.bodies.items[i];
                }
            }
        }

        return null;
    }

    /**
     * Does the given bodies touch each other?
     */
    bodiesTouch(bodyA: Body, bodyB: Body): boolean {
        const distance = this.getDistance(bodyA.x, bodyA.y, bodyB.x, bodyB.y),
            radius = bodyA.radius + bodyB.radius,
            match = bodyA.match(bodyB);

        return distance < radius && match;
    }

    /**
     * Is point in bound?
     */
    bodyInBound(body: Body, fromX: number, fromY: number, toX: number, toY: number): boolean {
        return (
            body.x + body.radius > fromX &&
            body.x - body.radius < toX &&
            body.y + body.radius > fromY &&
            body.y - body.radius < toY
        );
    }

    /**
     * Get distance between two points
     */
    getDistance(fromX: number, fromY: number, toX: number, toY: number): number {
        return Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
    }

    /**
     * Clear the island
     */
    clear() {
        this.bodies.clear();
    }
}
