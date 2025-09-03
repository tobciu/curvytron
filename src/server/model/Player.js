import BasePlayer from '../../shared/model/BasePlayer.js';

/**
 * Player
 */
class Player extends BasePlayer {
    /**
     * Serialize
     *
     * @return {Object}
     */
    serialize() {
        const data = super.serialize();
        data.active = this.client.active;
        return data;
    }
}

export default Player;
