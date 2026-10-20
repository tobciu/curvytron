import { BaseTrail } from '../../shared/model/BaseTrail.ts';

/**
 * Trail
 */
export class Trail extends BaseTrail {
    constructor(avatar) {
        super(avatar);
    }

    /**
     * Clear
     */
    clear() {
        super.clear();
        this.emit('clear', { avatar: this.avatar });
    }
}
