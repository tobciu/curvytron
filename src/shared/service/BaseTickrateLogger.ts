/**
 * Tickrate Logger
 */
export class BaseTickrateLogger {
    interval: ReturnType<typeof setInterval> | null;
    frequency: number;
    ticks: any[];

    constructor() {
        this.interval = null;
        this.frequency = 0;
        this.ticks = [];

        this.log = this.log.bind(this);
        this.tick = this.tick.bind(this);

        this.start();
    }

    /**
     * Tick
     */
    tick(data: any) {
        this.ticks.push(data);
    }

    /**
     * Log
     */
    log() {
        this.frequency = this.ticks.length;
        this.ticks.length = 0;
    }

    /**
     * Start
     */
    start() {
        if (!this.interval) {
            this.interval = setInterval(this.log, 1000);
        }
    }

    /**
     * Stop
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}
