import { BaseTrail } from '../../shared/model/BaseTrail.ts';

/**
 * Trail
 */
export class Trail extends BaseTrail {
    constructor(avatar: any) {
        super(avatar);
    }

    /**
     * Clear
     */
    override clear() {
        super.clear();
        this.emit('clear', { avatar: this.avatar });
    }
}
