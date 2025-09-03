import EventEmitter from 'events';
import RoomNameGenerator from '../service/RoomNameGenerator.js';
import Collection from '../../shared/Collection.js';
import Room from '../model/Room.js';

/**
 * Room Repository
 */
class RoomRepository extends EventEmitter {
    constructor() {
        super();

        this.generator = new RoomNameGenerator();
        this.rooms = new Collection([], 'name');

        this.onRoomClose = this.onRoomClose.bind(this);
    }

    /**
     * Create a room
     *
     * @param {String} name
     *
     * @return {Room}
     */
    create(name) {
        if (typeof (name) === 'undefined' || !name) {
            name = this.getRandomRoomName();
        }

        const room = new Room(name);

        if (!this.rooms.add(room)) { return false; }

        room.on('close', this.onRoomClose);
        this.emit('room:open', { room: room });

        return room;
    }

    /**
     * Delete a room
     *
     * @param {Room} room
     */
    remove(room) {
        if (this.rooms.remove(room)) {
            this.emit('room:close', { room: room });
            return true;
        }
        return false;
    }

    /**
     * Get by name
     *
     * @param {String} name
     *
     * @return {Room}
     */
    get(name) {
        return this.rooms.getById(name);
    }

    /**
     * Get all
     *
     * @return {Array}
     */
    all() {
        return this.rooms.items;
    }

    /**
     * On room close
     *
     * @param {Object} data
     */
    onRoomClose(data) {
        this.remove(data.room);
    }

    /**
     * Get random room name
     *
     * @return {String}
     */
    getRandomRoomName() {
        let name = this.generator.getName();
        while (this.rooms.ids.indexOf(name) >= 0) {
            name = this.generator.getName();
        }
        return name;
    }
}

export default RoomRepository;
