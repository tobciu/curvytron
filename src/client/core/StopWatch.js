/**
 * Stop watch
 *
 * @param {String} name
 * @param {Number} tolerance
 */
export class StopWatch {
    constructor(name, tolerance) {
        this.name = name;
        this.from = null;
        this.to = null;
        this.duration = 0;

        if (typeof tolerance === 'number') {
            this.tolerance = tolerance;
        }

        this.start();
    }

    /**
     * Start
     */
    start() {
        this.from = new Date();
    }

    /**
     * Stop
     */
    stop() {
        this.to = new Date();
        this.log(this.to.getTime() - this.from.getTime());
    }

    /**
     * Log duration
     *
     * @param {Number} duration
     */
    log(duration) {
        if (duration >= this.tolerance) {
            this.duration = duration;
            console.info(`${this.name}: ${this.duration}`);
        }
    }
}

/**
 * Duration
 *
 * @type {Number}
 */
StopWatch.prototype.tolerance = 2;
