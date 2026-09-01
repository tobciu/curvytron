import { EventEmitter } from 'eventemitter3';
import { Collection } from '@shared/Collection.ts';
import { Room } from '../model/Room.ts';
import { RoomNameGenerator } from '../service/RoomNameGenerator.ts';

/** Owns every open room; emits room:open / room:close. */
export class RoomRepository extends EventEmitter {
  generator = new RoomNameGenerator();
  rooms = new Collection<Room>([], 'name');

  constructor() {
    super();
    this.onRoomClose = this.onRoomClose.bind(this);
  }

  create(name?: string): Room | false {
    const roomName = name && name.length ? name : this.getRandomRoomName();
    const room = new Room(roomName);

    if (!this.rooms.add(room)) {
      return false;
    }

    room.on('close', this.onRoomClose);
    this.emit('room:open', { room });

    return room;
  }

  remove(room: Room): boolean {
    if (this.rooms.remove(room)) {
      this.emit('room:close', { room });
      return true;
    }
    return false;
  }

  get(name: string): Room | null {
    return this.rooms.getById(name);
  }

  all(): Room[] {
    return this.rooms.items;
  }

  onRoomClose(data: any): void {
    this.remove(data.room);
  }

  getRandomRoomName(): string {
    let name = this.generator.getName();
    while (this.rooms.ids.indexOf(name) >= 0) {
      name = this.generator.getName();
    }
    return name;
  }
}
