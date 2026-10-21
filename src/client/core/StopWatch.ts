/**
 * Stop watch
 */
export class StopWatch {
    name: any;
    from: any;
    to: any;
    duration: any;

    /**
     * Duration
     */
    tolerance: number = 2;

    constructor(name: any, tolerance?: any) {
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
     */
    log(duration: number) {
        if (duration >= this.tolerance) {
            this.duration = duration;
            console.info(`${this.name}: ${this.duration}`);
        }
    }
}
