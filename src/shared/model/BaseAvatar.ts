import { EventEmitter } from '#event-emitter';
import type { BaseBonusStack } from './BaseBonusStack.ts';
import type { BasePlayer } from './BasePlayer.ts';
import type { BaseTrail } from './BaseTrail.ts';

/**
 * Base Avatar
 */
export abstract class BaseAvatar extends EventEmitter {
    id: number;
    name: string;
    color: string;
    borderColor: string;
    player: BasePlayer;
    x: number;
    y: number;
    trail: BaseTrail;
    bonusStack: BaseBonusStack<any>;
    /** Collision body of the avatar, only used by the server */
    body: { radius: number } | null = null;
    angle: number;
    velocityX: number;
    velocityY: number;
    angularVelocity: number;
    alive: boolean;
    printing: boolean;
    score: number;
    roundScore: number;
    ready: boolean;
    present: boolean;

    /**
     * Default values of the properties that bonuses change: what an avatar goes back to
     *
     * - velocity: movement velocity
     * - angularVelocityBase: turn velocity
     * - radius: radius of the head
     * - inverse: inverted controls
     * - invincible: does not die on trails
     * - ghost: goes through borders
     * - directionInLoop: turns in a loop (true) or in straight angles (false)
     */
    static defaults = Object.freeze({
        velocity: 16,
        angularVelocityBase: 2.8 / 1000,
        radius: 0.6,
        inverse: false,
        invincible: false,
        ghost: false,
        directionInLoop: true
    });

    /**
     * Number of trail points that don't kill the player
     */
    trailLatency: number = 3;

    velocity: number = BaseAvatar.defaults.velocity;
    angularVelocityBase: number = BaseAvatar.defaults.angularVelocityBase;
    radius: number = BaseAvatar.defaults.radius;
    inverse: boolean = BaseAvatar.defaults.inverse;
    invincible: boolean = BaseAvatar.defaults.invincible;
    ghost: boolean = BaseAvatar.defaults.ghost;
    directionInLoop: boolean = BaseAvatar.defaults.directionInLoop;

    /** Create the trail of the avatar */
    abstract createTrail(): BaseTrail;

    /** Create the stack of bonuses of the avatar */
    abstract createBonusStack(): BaseBonusStack<any>;

    constructor(player: BasePlayer) {
        super();

        this.id = player.id as number;
        this.name = player.name;
        this.color = player.color;
        this.borderColor = player.color;
        this.player = player;
        this.x = 0;
        this.y = 0;
        this.trail = this.createTrail();
        this.bonusStack = this.createBonusStack();
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
     * Equal
     */
    equal(avatar: BaseAvatar): boolean {
        return this.id === avatar.id;
    }

    /**
     * Set Point
     */
    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    /**
     * Add point
     */
    addPoint(x: number, y: number, important?: boolean) {
        this.trail.addPoint(x, y);
    }

    /**
     * Update angular velocity
     */
    updateAngularVelocity(factor?: number) {
        if (factor === undefined) {
            if (this.angularVelocity === 0) {
                return;
            }
            factor = (this.angularVelocity > 0 ? 1 : -1) * (this.inverse ? -1 : 1);
        }

        this.setAngularVelocity(factor * this.angularVelocityBase * (this.inverse ? -1 : 1));
    }

    /**
     * Set angular velocity
     */
    setAngularVelocity(angularVelocity: number) {
        this.angularVelocity = angularVelocity;
    }

    /**
     * Set angle
     */
    setAngle(angle: number) {
        if (this.angle !== angle) {
            this.angle = angle;
            this.updateVelocities();
        }
    }

    /**
     * Update
     */
    update(step: number) {
        // Overridden by subclasses that move the avatar
    }

    /**
     * Add angle
     */
    updateAngle(step: number) {
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
     */
    updatePosition(step: number) {
        this.setPosition(this.x + this.velocityX * step, this.y + this.velocityY * step);
    }

    /**
     * Set velocity
     */
    setVelocity(velocity: number) {
        velocity = Math.max(velocity, BaseAvatar.defaults.velocity / 2);

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
            const ratio = this.velocity / BaseAvatar.defaults.velocity;
            this.angularVelocityBase = ratio * BaseAvatar.defaults.angularVelocityBase + Math.log(1 / ratio) / 1000;
            this.updateAngularVelocity();
        }
    }

    /**
     * Set radius
     */
    setRadius(radius: number) {
        this.radius = Math.max(radius, BaseAvatar.defaults.radius / 8);
    }

    /**
     * Set inverse
     */
    setInverse(inverse: boolean) {
        if (this.inverse !== inverse) {
            this.inverse = inverse;
            this.updateAngularVelocity();
        }
    }

    /**
     * Set invincible
     */
    setInvincible(invincible: boolean) {
        this.invincible = invincible;
    }

    /**
     * Set ghost
     */
    setGhost(ghost: boolean) {
        this.ghost = ghost;
    }

    /**
     * Get distance
     */
    getDistance(fromX: number, fromY: number, toX: number, toY: number): number {
        return Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
    }

    /**
     * Die
     */
    die(_body?: unknown) {
        this.bonusStack.clear();
        this.alive = false;
        this.addPoint(this.x, this.y);
    }

    /**
     * Set printing
     */
    setPrinting(printing: boolean) {
        printing = !!printing;

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
     */
    addScore(score: number) {
        this.setRoundScore(this.roundScore + score);
    }

    /**
     * Resolve score
     */
    resolveScore() {
        this.setScore(this.score + this.roundScore);
        this.roundScore = 0;
    }

    /**
     * This round score
     */
    setRoundScore(score: number) {
        this.roundScore = score;
    }

    /**
     * This score
     */
    setScore(score: number) {
        this.score = score;
    }

    /**
     * Set color
     */
    setColor(color: string) {
        this.color = color;
    }

    /**
     * Set borderColor
     */
    setBorderColor(borderColor: string) {
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
        this.velocity = BaseAvatar.defaults.velocity;
        this.alive = true;
        this.ghost = false;
        this.printing = false;
        this.color = this.player.color;
        this.borderColor = this.player.color;
        this.radius = BaseAvatar.defaults.radius;
        this.inverse = BaseAvatar.defaults.inverse;
        this.invincible = BaseAvatar.defaults.invincible;
        this.directionInLoop = BaseAvatar.defaults.directionInLoop;
        this.angularVelocityBase = BaseAvatar.defaults.angularVelocityBase;

        if (this.body) {
            this.body.radius = BaseAvatar.defaults.radius;
        }

        this.updateVelocities();
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
