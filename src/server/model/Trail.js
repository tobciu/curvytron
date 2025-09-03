import BaseTrail from '../../shared/model/BaseTrail.js';

/**
 * Trail
 */
class Trail extends BaseTrail {
    /**
     * Clear
     */
    clear() {
        super.clear();
        this.emit('clear', {avatar: this.avatar});
    }
}

export default Trail;
