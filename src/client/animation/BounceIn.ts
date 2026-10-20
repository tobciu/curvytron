/**
 * Bounce in animation
 */
export class BounceIn {
    duration: any;
    created: any;
    done: boolean;
    timeout: any;

    /**
     * Target value
     */
    target: number = 1;

    /**
     * Easing constant
     */
    factor: number = 1.77635683940025e-15;

    constructor(duration: any) {
        this.duration = duration;
        this.created = null;
        this.done = false;

        this.end = this.end.bind(this);

        this.start();
    }

    /**
     * Start animation
     */
    start(): void {
        this.created = new Date().getTime();
        this.timeout = setTimeout(this.end, this.duration);
    }

    /**
     * Get size
     */
    getValue(): number {
        return this.easeOutBack(this.getAge(), 0, this.target, this.duration, this.factor);
    }

    /**
     * Get age in millisecond
     */
    getAge(): number {
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
     */
    easeOutBack(time: number, begin: number, target: number, duration: number, factor: number): number {
        const ts = (time /= duration) * time,
            tc = ts * time;
        return begin + target * (factor * tc * ts + 4 * tc + -9 * ts + 6 * time);
    }
}
