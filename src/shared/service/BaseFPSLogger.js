import EventEmitter from 'tom32i-event-emitter.js';

/**
 * FPS Logger
 */
class BaseFPSLogger extends EventEmitter {
    constructor() {
        super();

        this.interval = null;
        this.frames = 0;
        this.frequency = 0;

        this.onFrame = this.onFrame.bind(this);
        this.log = this.log.bind(this);

        this.start();
    }

    /**
     * End frame
     */
    onFrame() {
        this.frames++;
    }

    /**
     * Log
     */
    log() {
        this.frequency = this.frames;
        this.frames = 0;
    }

    /**
     * Start
     */
    start() {
        if (!this.interval) {
            this.frames = 0;
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
            this.frequency = 0;
        }
    }
}

export default BaseFPSLogger;
