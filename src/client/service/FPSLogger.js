import { BaseFPSLogger } from '../../shared/service/BaseFPSLogger.js';

/**
 * FPS Logger
 */
export class FPSLogger extends BaseFPSLogger {
    constructor() {
        super();
    }

    /**
     * Load FPS
     */
    log() {
        super.log();
        this.emit('fps', this.frequency);
    }
}
