import Collection from '../../shared/Collection.js';
import Island from './Island.js';
import Body from './Body.js';

/**
 * World
 */
class World {
    /**
     * Island grid size (width of the island)
     *
     * @type {Number}
     */
    islandGridSize = 40;

    constructor(size, islands) {
        islands = typeof (islands) === 'number' ? islands : Math.round(size / this.islandGridSize);

        this.size = size;
        this.islands = new Collection();
        this.islandSize = this.size / islands;
        this.active = false;
        this.bodyCount = 0;

        for (let x, y = islands - 1; y >= 0; y--) {
            for (x = islands - 1; x >= 0; x--) {
                const id = x.toString() + ':' + y.toString();
                this.islands.add(new Island(id, this.islandSize, x * this.islandSize, y * this.islandSize));
            }
        }
    }

    /**
     * Get the island responsible for the given point
     *
     * @param {Number} x
     * @param {Number} y
     *
     * @return {Island}
     */
    getIslandByPoint(pX, pY) {
        const x = Math.floor(pX / this.islandSize);
        const y = Math.floor(pY / this.islandSize);
        const id = x.toString() + ':' + y.toString();
        return this.islands.getById(id);
    }

    /**
     * Add a body to all concerned islands
     *
     * @param {Body} body
     */
    addBody(body) {
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
     *
     * @param {Body} body
     * @param {Number} x
     * @param {Number} y
     */
    addBodyByPoint(body, x, y) {
        const island = this.getIslandByPoint(x, y);
        if (island) {
            island.addBody(body);
        }
    }

    /**
     * Remove a body from islands
     *
     * @param {Body} body
     */
    removeBody(body) {
        if (!this.active) {
            return;
        }

        for (let i = body.islands.items.length - 1; i >= 0; i--) {
            body.islands.items[i].removeBody(body);
        }
    }

    /**
     * Get one or no body coliding with the given body
     *
     * @param {Body} body
     *
     * @return {Body|null}
     */
    getBody(body) {
        return this.getBodyByPoint(body, body.x - body.radius, body.y - body.radius) ||
            this.getBodyByPoint(body, body.x + body.radius, body.y - body.radius) ||
            this.getBodyByPoint(body, body.x - body.radius, body.y + body.radius) ||
            this.getBodyByPoint(body, body.x + body.radius, body.y + body.radius);
    }

    /**
     * Get one or no body coliding with the given body for the given point
     *
     * @param {Body} body
     * @param {Number} x
     * @param {Number} y
     *
     * @return {Body|null}
     */
    getBodyByPoint(body, x, y) {
        const island = this.getIslandByPoint(x, y);
        return island ? island.getBody(body) : null;
    }

    /**
     * Test if the body position is free (there are no bodies for this position)
     *
     * @param {Body} body
     *
     * @return {Boolean}
     */
    testBody(body) {
        return this.testBodyByPoint(body, body.x - body.radius, body.y - body.radius) &&
            this.testBodyByPoint(body, body.x + body.radius, body.y - body.radius) &&
            this.testBodyByPoint(body, body.x - body.radius, body.y + body.radius) &&
            this.testBodyByPoint(body, body.x + body.radius, body.y + body.radius);
    }

    /**
     * Test if the body position is free for the given point
     *
     * @param {Body} Body
     * @param {Number} x
     * @param {Number} y
     */
    testBodyByPoint(body, x, y) {
        const island = this.getIslandByPoint(x, y);
        return island ? island.testBody(body) : false;
    }

    /**
     * Random a random, free of bodies, position
     *
     * @param {Number} radius
     * @param {Number} border
     *
     * @return {Array}
     */
    getRandomPosition(radius, border) {
        const margin = radius + border * this.size;
        const body = new Body(this.getRandomPoint(margin), this.getRandomPoint(margin), margin);

        while (!this.testBody(body)) {
            body.x = this.getRandomPoint(margin);
            body.y = this.getRandomPoint(margin);
        }

        return [body.x, body.y];
    }

    /**
     * Random random direction
     *
     * @param {Number} x
     * @param {Number} y
     * @param {Number} tolerance
     *
     * @return {Float}
     */
    getRandomDirection(x, y, tolerance) {
        let direction = this.getRandomAngle();
        const margin = tolerance * this.size;

        while (!this.isDirectionValid(direction, x, y, margin)) {
            direction = this.getRandomAngle();
        }

        return direction;
    }

    /**
     * Is direction valid
     *
     * @param {Float} angle
     * @param {Number} x
     * @param {Number} y
     * @param {Float} margin
     *
     * @return {Boolean}
     */
    isDirectionValid(angle, x, y, margin) {
        const quarter = Math.PI / 2;

        for (let i = 0; i < 4; i++) {
            const from = quarter * i;
            const to = quarter * (i + 1);

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
    }

    /**
     * Get hypotenuse from adjacent side
     *
     * @param {Float} angle
     * @param {Number} adjacent
     *
     * @return {Float}
     */
    getHypotenuse(angle, adjacent) {
        return adjacent / Math.cos(angle);
    }

    /**
     * Get random angle
     *
     * @return {Float}
     */
    getRandomAngle() {
        return Math.random() * Math.PI * 2;
    }

    /**
     * Get random point
     *
     * @param {Number} margin
     *
     * @return {Array}
     */
    getRandomPoint(margin) {
        return margin + Math.random() * (this.size - margin * 2);
    }

    /**
     * Get intersection between given body and the map borders
     *
     * @param {Body} body
     * @param {Number} margin
     *
     * @return {Boolean}
     */
    getBoundIntersect(body, margin) {
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
     *
     * @param {Number} x
     * @param {Number} y
     *
     * @return {Array}
     */
    getOposite(x, y) {
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
     *
     * @param {Number} border
     * @param {Number} x
     * @param {Number} y
     *
     * @return {Float}
     */
    getDistanceToBorder(border, x, y) {
        if (border === 0) {
            return this.size - x;
        }
        if (border === 1) {
            return this.size - y;
        }
        if (border === 2) {
            return x;
        }
        if (border === 3) {
            return y;
        }
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

export default World;
