import { EventEmitter } from '#event-emitter';
import { Room } from '../model/Room.ts';
import { RoomNameGenerator } from '../service/RoomNameGenerator.ts';
import { Collection } from '../../shared/Collection.ts';

/**
 * Room Repository
 */
export class RoomRepository extends EventEmitter {
    /** Rooms that can be open at the same time */
    static maxRooms: number = 500;

    generator: RoomNameGenerator;
    rooms: Collection;

    constructor() {
        super();

        this.generator = new RoomNameGenerator();
        this.rooms = new Collection([], 'name');

        this.onRoomClose = this.onRoomClose.bind(this);
    }

    /**
     * Create a room
     */
    create(name?: string) {
        if (name === undefined || !name) {
            name = this.getRandomRoomName();
        }

        if (this.rooms.count() >= RoomRepository.maxRooms) {
            return false;
        }

        const room = new Room(name);

        if (!this.rooms.add(room)) {
            return false;
        }

        room.on('close', this.onRoomClose);
        this.emit('room:open', { room });

        return room;
    }

    /**
     * Delete a room
     */
    remove(room: Room) {
        if (this.rooms.remove(room)) {
            this.emit('room:close', { room });

            return true;
        }

        return false;
    }

    /**
     * Get by name
     */
    get(name: string) {
        return this.rooms.getById(name);
    }

    /**
     * Get all
     */
    all() {
        return this.rooms.items;
    }

    /**
     * On room close
     */
    onRoomClose(data: any) {
        this.remove(data.room);
    }

    /**
     * Get random room name
     */
    getRandomRoomName(): string {
        let name = this.generator.getName();

        while (this.rooms.ids.includes(name)) {
            name = this.generator.getName();
        }

        return name;
    }
}
