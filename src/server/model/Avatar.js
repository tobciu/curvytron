import BaseAvatar from '../../shared/model/BaseAvatar.js';
import AvatarBody from '../core/AvatarBody.js';
import PrintManager from '../manager/PrintManager.js';

/**
 * Avatar
 */
class Avatar extends BaseAvatar {
    constructor(player) {
        super(player);

        this.bodyCount = 0;
        this.body = new AvatarBody(this.x, this.y, this);
        this.printManager = new PrintManager(this);
    }

    /**
     * Update
     *
     * @param {Number} step
     */
    update(step) {
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
     *
     * @return {Boolean}
     */
    isTimeToDraw() {
        if (this.trail.lastX === null) {
            return true;
        }

        return this.getDistance(this.trail.lastX, this.trail.lastY, this.x, this.y) > this.radius;
    }

    /**
     * Set position
     *
     * @param {Number} x
     * @param {Number} y
     */
    setPosition(x, y) {
        super.setPosition(x, y);

        this.body.x = this.x;
        this.body.y = this.y;
        this.body.num = this.bodyCount;

        this.emit('position', this);
    }

    /**
     * Set velocity
     *
     * @param {Number} step
     */
    setVelocity(velocity) {
        if (this.velocity !== velocity) {
            super.setVelocity(velocity);
            this.emit('property', {avatar: this, property: 'velocity', value: this.velocity});
        }
    }

    /**
     * Set angle
     *
     * @param {Array} point
     */
    setAngle(angle) {
        if (this.angle !== angle) {
            super.setAngle(angle);
            this.emit('angle', this);
        }
    }

    /**
     * Set angular velocity
     *
     * @param {Number} velocity
     */
    setAngularVelocity(angularVelocity) {
        if (this.angularVelocity !== angularVelocity) {
            super.setAngularVelocity(angularVelocity);
        }
    }

    /**
     * Set angular velocity
     *
     * @param {Float} velocity
     */
    setRadius(radius) {
        if (this.radius !== radius) {
            super.setRadius(radius);
            this.body.radius = this.radius;
            this.emit('property', {avatar: this, property: 'radius', value: this.radius});
        }
    }

    /**
     * Set invincible
     *
     * @param {Number} invincible
     */
    setInvincible(invincible) {
        super.setInvincible(invincible);
        this.emit('property', {avatar: this, property: 'invincible', value: this.invincible});
    }

    /**
     * Set ghost
     *
     * @param {Number} ghost
     */
    setGhost(ghost) {
        super.setGhost(ghost);
        this.emit('property', {avatar: this, property: 'ghost', value: this.ghost});
    }

    /**
     * Set inverse
     *
     * @param {Number} inverse
     */
    setInverse(inverse) {
        super.setInverse(inverse);
        this.emit('property', {avatar: this, property: 'inverse', value: this.inverse});
    }

    /**
     * Set color
     *
     * @param {Number} color
     */
    setColor(color) {
        this.color = color;
        this.emit('property', {avatar: this, property: 'color', value: this.color});
    }

    /**
     * Set borderColor
     *
     * @param {Number} borderColor
     */
    setBorderColor(borderColor) {
        this.borderColor = borderColor;
        this.emit('property', {avatar: this, property: 'borderColor', value: this.borderColor});
    }

    /**
     * Add point
     *
     * @param {Float} x
     * @param {Float} y
     * @param {Boolean} important
     */
    addPoint(x, y, important) {
        super.addPoint(x, y);
        this.emit('point', {avatar: this, x: x, y: y, important: important});
    }

    /**
     * Set printing
     *
     * @param {Boolean} printing
     */
    setPrinting(printing) {
        super.setPrinting(printing);
        this.emit('property', {avatar: this, property: 'printing', value: this.printing});
    }

    /**
     * Die
     *
     * @param {Bodynull} body
     */
    die(body) {
        super.die();
        this.printManager.stop();
        this.emit('die', {
            avatar: this,
            killer: body ? body.data : null,
            old: body ? body.isOld() : null
        });
    }

    /**
     * Set score
     *
     * @param {Number} score
     */
    setScore(score) {
        super.setScore(score);
        this.emit('score', this);
    }

    /**
     * Set round score
     *
     * @param {Number} score
     */
    setRoundScore(score) {
        super.setRoundScore(score);
        this.emit('score:round', this);
    }

    /**
     * Clear
     */
    clear() {
        super.clear();
        this.printManager.stop();
        this.bodyCount = 0;
    }
}

export default Avatar;
