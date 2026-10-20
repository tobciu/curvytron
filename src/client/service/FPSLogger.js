import { BaseFPSLogger } from '../../shared/service/BaseFPSLogger.ts';

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
