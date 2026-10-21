import { AvatarBody } from '../core/AvatarBody.ts';
import { PrintManager } from '../manager/PrintManager.ts';
import { BaseAvatar } from '../../shared/model/BaseAvatar.ts';
import { Trail } from './Trail.ts';
import { BonusStack } from './BonusStack.ts';

/**
 * Avatar
 */
export class Avatar extends BaseAvatar {
    bodyCount: number;
    declare body: AvatarBody;
    printManager: PrintManager;

    constructor(player: any) {
        super(player);

        this.bodyCount = 0;
        this.body = new AvatarBody(this.x, this.y, this);
        this.printManager = new PrintManager(this);
    }

    /**
     * Create the trail
     */
    createTrail() {
        return new Trail(this);
    }

    /**
     * Create the bonus stack
     */
    createBonusStack() {
        return new BonusStack(this);
    }

    /**
     * Update
     */
    override update(step: number) {
        if (this.alive) {
            this.updateAngle(step);
            this.updatePosition(step);

            if (this.printing && this.isTimeToDraw()) {
                this.addPoint(this.x, this.y);
            }
        }
    }

    /**
     * Is time to draw?
     */
    isTimeToDraw(): boolean {
        if (this.trail.lastX === null) {
            return true;
        }

        return this.getDistance(this.trail.lastX, this.trail.lastY as number, this.x, this.y) > this.radius;
    }

    /**
     * Set position
     */
    override setPosition(x: number, y: number) {
        super.setPosition(x, y);

        this.body.x = this.x;
        this.body.y = this.y;
        this.body.num = this.bodyCount;

        this.emit('position', this);
    }

    /**
     * Set velocity
     */
    override setVelocity(velocity: any) {
        if (this.velocity !== velocity) {
            super.setVelocity(velocity);
            this.emit('property', { avatar: this, property: 'velocity', value: this.velocity });
        }
    }

    /**
     * Set angle
     */
    override setAngle(angle: any) {
        if (this.angle !== angle) {
            super.setAngle(angle);
            this.emit('angle', this);
        }
    }

    /**
     * Set angular velocity
     */
    override setAngularVelocity(angularVelocity: any) {
        if (this.angularVelocity !== angularVelocity) {
            super.setAngularVelocity(angularVelocity);
        }
    }

    /**
     * Set angular velocity
     */
    override setRadius(radius: any) {
        if (this.radius !== radius) {
            super.setRadius(radius);
            this.body.radius = this.radius;
            this.emit('property', { avatar: this, property: 'radius', value: this.radius });
        }
    }

    /**
     * Set invincible
     */
    override setInvincible(invincible: boolean) {
        super.setInvincible(invincible);
        this.emit('property', { avatar: this, property: 'invincible', value: this.invincible });
    }

    /**
     * Set ghost
     */
    override setGhost(ghost: boolean) {
        super.setGhost(ghost);
        this.emit('property', { avatar: this, property: 'ghost', value: this.ghost });
    }

    /**
     * Set inverse
     */
    override setInverse(inverse: boolean) {
        super.setInverse(inverse);
        this.emit('property', { avatar: this, property: 'inverse', value: this.inverse });
    }

    /**
     * Set color
     */
    override setColor(color: string) {
        this.color = color;
        this.emit('property', { avatar: this, property: 'color', value: this.color });
    }

    /**
     * Set borderColor
     */
    override setBorderColor(borderColor: string) {
        this.borderColor = borderColor;
        this.emit('property', { avatar: this, property: 'borderColor', value: this.borderColor });
    }

    /**
     * Add point
     */
    override addPoint(x: number, y: number, important?: boolean) {
        super.addPoint(x, y);
        this.emit('point', { avatar: this, x, y, important });
    }

    /**
     * Set printing
     */
    override setPrinting(printing: boolean) {
        super.setPrinting(printing);
        this.emit('property', { avatar: this, property: 'printing', value: this.printing });
    }

    /**
     * Die
     */
    override die(body?: any) {
        super.die(body);
        this.printManager.stop();
        this.emit('die', {
            avatar: this,
            killer: body ? body.data : null,
            old: body ? body.isOld() : null
        });
    }

    /**
     * Set score
     */
    override setScore(score: number) {
        super.setScore(score);
        this.emit('score', this);
    }

    /**
     * Set round score
     */
    override setRoundScore(score: number) {
        super.setRoundScore(score);
        this.emit('score:round', this);
    }

    /**
     * Clear
     */
    override clear() {
        super.clear();
        this.printManager.stop();
        this.bodyCount = 0;
    }
}
