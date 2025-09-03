import EventEmitter from 'tom32i-event-emitter.js';
import Trail from './BaseTrail.js';
import BonusStack from './BaseBonusStack.js';

/**
 * Base Avatar
 */
class BaseAvatar extends EventEmitter {
    constructor(player) {
        super();

        this.id = player.id;
        this.name = player.name;
        this.color = player.color;
        this.borderColor = player.color;
        this.player = player;
        this.x = 0;
        this.y = 0;
        this.trail = new Trail(this);
        this.bonusStack = new BonusStack(this);
        this.angle = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.angularVelocity = 0;
        this.alive = true;
        this.printing = false;
        this.score = 0;
        this.roundScore = 0;
        this.ready = false;
        this.present = true;

        // useless too? this.updateVelocities();
    }

    /**
     * Movement velocity
     *
     * @type {Number}
     */
    velocity = 16;

    /**
     * Turn velocity
     *
     * @type {Float}
     */
    angularVelocityBase = 2.8 / 1000;

    /**
     * Radius
     *
     * @type {Number}
     */
    radius = 0.6;

    /**
     * Number of trail points that don't kill the player
     *
     * @type {Number}
     */
    trailLatency = 3;

    /**
     * Inverted controls
     *
     * @type {Boolean}
     */
    inverse = false;

    /**
     * Invincible
     *
     * @type {Boolean}
     */
    invincible = false;

    /**
     * Invincible
     *
     * @type {Boolean}
     */
    ghost = false;

    /**
     * Type of tunrn: round or straight
     *
     * @type {Boolean}
     */
    directionInLoop = true;

    /**
     * Equal
     *
     * @param {Avatar} avatar
     *
     * @return {Boolean}
     */
    equal(avatar) {
        return this.id === avatar.id;
    }

    /**
     * Set Point
     *
     * @param {Float} x
     * @param {Float} y
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Add point
     *
     * @param {Float} x
     * @param {Float} y
     */
    addPoint(x, y) {
        this.trail.addPoint(x, y);
    }

    /**
     * Update angular velocity
     *
     * @param {Number} factor
     */
    updateAngularVelocity(factor) {
        if (typeof(factor) === 'undefined') {
            if (this.angularVelocity === 0) { return; }
            factor = (this.angularVelocity > 0 ? 1 : -1) * (this.inverse ? -1 : 1);
        }

        this.setAngularVelocity(factor * this.angularVelocityBase * (this.inverse ? -1 : 1));
    }

    /**
     * Set angular velocity
     *
     * @param {Float} angularVelocity
     */
    setAngularVelocity(angularVelocity) {
        this.angularVelocity = angularVelocity;
    }

    /**
     * Set angle
     *
     * @param {Float} angle
     */
    setAngle(angle) {
        if (this.angle !== angle) {
            this.angle = angle;
            this.updateVelocities();
        }
    }

    /**
     * Update
     *
     * @param {Number} step
     */
    update(step) {
        this.updateAngle(step);
        this.updatePosition(step);
    }

    /**
     * Add angle
     *
     * @param {Number} step
     */
    updateAngle(step) {
        if (this.angularVelocity) {
            if (this.directionInLoop) {
                this.setAngle(this.angle + this.angularVelocity * step);
            } else {
                this.setAngle(this.angle + this.angularVelocity);
                this.updateAngularVelocity(0);
            }
        }
    }

    /**
     * Update position
     *
     * @param {Number} step
     */
    updatePosition(step) {
        this.setPosition(
            this.x + this.velocityX * step,
            this.y + this.velocityY * step
        );
    }

    /**
     * Set velocity
     *
     * @param {Number} step
     */
    setVelocity(velocity) {
        velocity = Math.max(velocity, BaseAvatar.prototype.velocity / 2);

        if (this.velocity !== velocity) {
            this.velocity = velocity;
            this.updateVelocities();
        }
    }

    /**
     * Update velocities
     */
    updateVelocities() {
        const velocity = this.velocity / 1000;

        this.velocityX = Math.cos(this.angle) * velocity;
        this.velocityY = Math.sin(this.angle) * velocity;

        this.updateBaseAngularVelocity();
    }

    /**
     * Update base angular velocity
     */
    updateBaseAngularVelocity() {
        if (this.directionInLoop) {
            const ratio = this.velocity / BaseAvatar.prototype.velocity;
            this.angularVelocityBase = ratio * BaseAvatar.prototype.angularVelocityBase + Math.log(1 / ratio) / 1000;
            this.updateAngularVelocity();
        }
    }

    /**
     * Set radius
     *
     * @param {Number} radius
     */
    setRadius(radius) {
        this.radius = Math.max(radius, BaseAvatar.prototype.radius / 8);
    }

    /**
     * Set inverse
     *
     * @param {Number} inverse
     */
    setInverse(inverse) {
        if (this.inverse !== inverse) {
            this.inverse = inverse ? true : false;
            this.updateAngularVelocity();
        }
    }

    /**
     * Set invincible
     *
     * @param {Number} invincible
     */
    setInvincible(invincible) {
        this.invincible = invincible ? true : false;
    }

    /**
     * Set ghost
     *
     * @param {Number} ghost
     */
    setGhost(ghost) {
        this.ghost = ghost ? true : false;
    }

    setStraightAngle(straightAngle) {
        this.directionInLoop = !straightAngle;
    }

    setBorderless(borderless) {
        this.borderless = borderless;
    }

    /**
     * Get distance
     *
     * @param {Number} fromX
     * @param {Number} fromY
     * @param {Number} toX
     * @param {Number} toY
     *
     * @return {Number}
     */
    getDistance(fromX, fromY, toX, toY) {
        return Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
    }

    /**
     * Die
     */
    die() {
        this.bonusStack.clear();
        this.alive = false;
        this.addPoint(this.x, this.y);
    }

    /**
     * Set printing
     *
     * @param {Boolean} printing
     */
    setPrinting(printing) {
        printing = printing ? true : false;

        if (this.printing !== printing) {
            this.printing = printing;

            this.addPoint(this.x, this.y, true);

            if (!this.printing) {
                this.trail.clear();
            }
        }
    }

    /**
     * This score
     *
     * @param {Number} score
     */
    addScore(score) {
        this.setRoundScore(this.roundScore + score);
    }

    /**
     * Resolve score
     *
     * @param {Number} score
     */
    resolveScore() {
        this.setScore(this.score + this.roundScore);
        this.roundScore = 0;
    }

    /**
     * This round score
     *
     * @param {Number} score
     */
    setRoundScore(score) {
        this.roundScore = score;
    }

    /**
     * This score
     *
     * @param {Number} score
     */
    setScore(score) {
        this.score = score;
    }

    /**
     * Set color
     *
     * @param {Number} color
     */
    setColor(color) {
        this.color = color;
    }

    /**
     * Set borderColor
     *
     * @param {Number} color
     */
    setBorderColor(borderColor) {
        this.borderColor = borderColor;
    }

    /**
     * Clear
     */
    clear() {
        this.bonusStack.clear();

        this.x = this.radius;
        this.y = this.radius;
        this.angle = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.angularVelocity = 0;
        this.roundScore = 0;
        this.velocity = BaseAvatar.prototype.velocity;
        this.alive = true;
        this.ghost = false;
        this.printing = false;
        this.color = this.player.color;
        this.borderColor = this.player.color;
        this.radius = BaseAvatar.prototype.radius;
        this.inverse = BaseAvatar.prototype.inverse;
        this.invincible = BaseAvatar.prototype.invincible;
        this.directionInLoop = BaseAvatar.prototype.directionInLoop;
        this.angularVelocityBase = BaseAvatar.prototype.angularVelocityBase;

        if (this.body) {
            this.body.radius = BaseAvatar.prototype.radius;
        }

        // useless? this.updateVelocities();
    }

    /**
     * Destroy
     */
    destroy() {
        this.clear();
        this.present = false;
        this.alive = false;
    }

    /**
     * Serialize
     *
     * @return {Object}
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            borderColor: this.borderColor,
            score: this.score
        };
    }
}

export default BaseAvatar;
