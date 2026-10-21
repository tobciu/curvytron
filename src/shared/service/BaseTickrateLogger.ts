/**
 * Tickrate Logger
 */
export class BaseTickrateLogger {
    interval: ReturnType<typeof setInterval> | null = null;
    frequency: number = 0;
    ticks: any[];

    constructor() {
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
        this.interval ??= setInterval(this.log, 1000);
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
