import { Body } from './Body.ts';
import { Island } from './Island.ts';
import { Collection } from '../../shared/Collection.ts';

/**
 * World
 */
export class World {
    size: any;
    islands: Collection;
    islandSize: number;
    active: boolean;
    bodyCount: number;

    /**
     * Island grid size (width of the island)
     */
    islandGridSize: number = 40;

    constructor(size: any, islands?: any) {
        islands = typeof islands === 'number' ? islands : Math.round(size / this.islandGridSize);

        this.size = size;
        this.islands = new Collection();
        this.islandSize = this.size / islands;
        this.active = false;
        this.bodyCount = 0;

        for (let id, x, y = islands - 1; y >= 0; y--) {
            for (x = islands - 1; x >= 0; x--) {
                id = `${x.toString()}:${y.toString()}`;
                this.islands.add(new Island(id, this.islandSize, x * this.islandSize, y * this.islandSize));
            }
        }
    }

    /**
     * Get the island responsible for the given point
     */
    getIslandByPoint(pX: any, pY: any) {
        const x = Math.floor(pX / this.islandSize),
            y = Math.floor(pY / this.islandSize),
            id = `${x.toString()}:${y.toString()}`;

        return this.islands.getById(id);
    }

    /**
     * Add a body to all concerned islands
     */
    addBody(body: Body) {
        if (!this.active) {
            return;
        }

        body.id = this.bodyCount++;

        this.addBodyByPoint(body, body.x - body.radius, body.y - body.radius);
        this.addBodyByPoint(body, body.x + body.radius, body.y - body.radius);
        this.addBodyByPoint(body, body.x - body.radius, body.y + body.radius);
        this.addBodyByPoint(body, body.x + body.radius, body.y + body.radius);
    }

    /**
     * Add a body to an island if it's concerned by the given point
     */
    addBodyByPoint(body: Body, x: number, y: number) {
        const island = this.getIslandByPoint(x, y);

        if (island) {
            island.addBody(body);
        }
    }

    /**
     * Remove a body from islands
     */
    removeBody(body: Body) {
        if (!this.active) {
            return;
        }

        for (let i = body.islands.items.length - 1; i >= 0; i--) {
            body.islands.items[i].removeBody(body);
        }
    }

    /**
     * Get one or no body coliding with the given body
     */
    getBody(body: Body) {
        return (
            this.getBodyByPoint(body, body.x - body.radius, body.y - body.radius) ||
            this.getBodyByPoint(body, body.x + body.radius, body.y - body.radius) ||
            this.getBodyByPoint(body, body.x - body.radius, body.y + body.radius) ||
            this.getBodyByPoint(body, body.x + body.radius, body.y + body.radius)
        );
    }

    /**
     * Get one or no body coliding with the given body for the given point
     */
    getBodyByPoint(body: Body, x: number, y: number) {
        const island = this.getIslandByPoint(x, y);

        return island ? island.getBody(body) : null;
    }

    /**
     * Test if the body position is free (there are no bodies for this position)
     */
    testBody(body: Body): boolean {
        return (
            this.testBodyByPoint(body, body.x - body.radius, body.y - body.radius) &&
            this.testBodyByPoint(body, body.x + body.radius, body.y - body.radius) &&
            this.testBodyByPoint(body, body.x - body.radius, body.y + body.radius) &&
            this.testBodyByPoint(body, body.x + body.radius, body.y + body.radius)
        );
    }

    /**
     * Test if the body position is free for the given point
     */
    testBodyByPoint(body: any, x: number, y: number) {
        const island = this.getIslandByPoint(x, y);

        return island ? island.testBody(body) : false;
    }

    /**
     * Random a random, free of bodies, position
     */
    getRandomPosition(radius: number, border: number) {
        const margin = radius + border * this.size,
            body = new Body(this.getRandomPoint(margin), this.getRandomPoint(margin), margin);

        while (!this.testBody(body)) {
            body.x = this.getRandomPoint(margin);
            body.y = this.getRandomPoint(margin);
        }

        return [body.x, body.y];
    }

    /**
     * Random random direction
     */
    getRandomDirection(x: number, y: number, tolerance: number): number {
        let direction = this.getRandomAngle();
        const margin = tolerance * this.size;

        while (!this.isDirectionValid(direction, x, y, margin)) {
            direction = this.getRandomAngle();
        }

        return direction;
    }

    /**
     * Is direction valid
     */
    isDirectionValid(angle: number, x: number, y: number, margin: number): boolean {
        const quarter = Math.PI / 2;
        let from;
        let to;

        for (let i = 0; i < 4; i++) {
            from = quarter * i;
            to = quarter * (i + 1);

            if (angle >= from && angle < to) {
                if (this.getHypotenuse(angle - from, this.getDistanceToBorder(i, x, y)) < margin) {
                    return false;
                }

                if (this.getHypotenuse(to - angle, this.getDistanceToBorder(i < 3 ? i + 1 : 0, x, y)) < margin) {
                    return false;
                }

                return true;
            }
        }

        return false;
    }

    /**
     * Get hypotenuse from adjacent side
     */
    getHypotenuse(angle: number, adjacent: number): number {
        return adjacent / Math.cos(angle);
    }

    /**
     * Get random angle
     */
    getRandomAngle(): number {
        return Math.random() * Math.PI * 2;
    }

    /**
     * Get random point
     */
    getRandomPoint(margin: number) {
        return margin + Math.random() * (this.size - margin * 2);
    }

    /**
     * Get intersection between given body and the map borders
     */
    getBoundIntersect(body: Body, margin: number): number[] | null {
        if (body.x - margin < 0) {
            return [0, body.y];
        }

        if (body.x + margin > this.size) {
            return [this.size, body.y];
        }

        if (body.y - margin < 0) {
            return [body.x, 0];
        }

        if (body.y + margin > this.size) {
            return [body.x, this.size];
        }

        return null;
    }

    /**
     * Get oposite point
     */
    getOposite(x: number, y: number) {
        if (x === 0) {
            return [this.size, y];
        }

        if (x === this.size) {
            return [0, y];
        }

        if (y === 0) {
            return [x, this.size];
        }

        if (y === this.size) {
            return [x, 0];
        }

        return [x, y];
    }

    /**
     * Get the distance of a point to the border
     */
    getDistanceToBorder(border: number, x: number, y: number): number {
        if (border === 0) {
            return this.size - x;
        }

        if (border === 1) {
            return this.size - y;
        }

        if (border === 2) {
            return x;
        }

        return y;
    }

    /**
     * Clear the world
     */
    clear() {
        this.active = false;
        this.bodyCount = 0;

        for (let i = this.islands.items.length - 1; i >= 0; i--) {
            this.islands.items[i].clear();
        }
    }

    /**
     * Activate
     */
    activate() {
        this.active = true;
    }
}
