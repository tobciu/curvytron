/**
 * Bounce in animation
 *
 * @param {Number} duration
 */
export class BounceIn {
    constructor(duration) {
        this.duration = duration;
        this.created = null;
        this.done = false;

        this.end = this.end.bind(this);

        this.start();
    }

    /**
     * Start animation
     *
     * @return {String}
     */
    start() {
        this.created = new Date().getTime();
        this.timeout = setTimeout(this.end, this.duration);
    }

    /**
     * Get size
     *
     * @return {Float}
     */
    getValue() {
        return this.easeOutBack(this.getAge(), 0, this.target, this.duration, this.factor);
    }

    /**
     * Get age in millisecond
     *
     * @return {Number}
     */
    getAge() {
        return new Date().getTime() - this.created;
    }

    /**
     * End
     */
    end() {
        this.timeout = clearTimeout(this.timeout);
        this.done = true;
    }

    /**
     * Ease out back
     *
     * @param {Number} time
     * @param {Number} begin
     * @param {Number} target
     * @param {Number} duration
     * @param {Float} factor
     *
     * @return {Float}
     */
    easeOutBack(time, begin, target, duration, factor) {
        const ts = (time /= duration) * time,
            tc = ts * time;
        return begin + target * (factor * tc * ts + 4 * tc + -9 * ts + 6 * time);
    }
}

/**
 * Target value
 *
 * @type {Number}
 */
BounceIn.prototype.target = 1;

/**
 * Easing constant
 *
 * @type {Number}
 */
BounceIn.prototype.factor = 1.77635683940025e-15;
