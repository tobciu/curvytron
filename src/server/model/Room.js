import BaseRoom from '../../shared/model/BaseRoom.js';
import RoomController from '../controller/RoomController.js';

/**
 * Room
 */
class Room extends BaseRoom {
    constructor(name) {
        super(name);
        this.controller = new RoomController(this);
    }

    /**
     * Close
     */
    close() {
        this.emit('close', { room: this });
    }

    /**
     * Add player
     *
     * @param {Player} player
     */
    addPlayer(player) {
        const result = super.addPlayer(player);

        if (result) {
            this.emit('player:join', { room: this, player: player });
        }

        return result;
    }

    /**
     * Remove player
     *
     * @param {Player} player
     */
    removePlayer(player) {
        const result = super.removePlayer(player);

        if (result) {
            this.emit('player:leave', { room: this, player: player });
        }

        return result;
    }
}

export default Room;
