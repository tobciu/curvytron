import { EventEmitter } from 'eventemitter3';
import { SocketGroup } from '../core/SocketGroup.ts';
import { Room } from '../model/Room.ts';
import type { RoomRepository } from '../repository/RoomRepository.ts';
import type { SocketClient } from '../core/SocketClient.ts';

/** Lobby-level controller: room list, create, join. */
export class RoomsController extends EventEmitter {
  socketGroup = new SocketGroup();
  repository: RoomRepository;

  callbacks: {
    emitAllRooms(this: SocketClient): void;
    onCreateRoom(this: SocketClient, data: any): void;
    onJoinRoom(this: SocketClient, data: any): void;
  };

  constructor(repository: RoomRepository) {
    super();

    const controller = this;
    this.repository = repository;

    this.onRoomOpen = this.onRoomOpen.bind(this);
    this.onRoomClose = this.onRoomClose.bind(this);
    this.onRoomPlayer = this.onRoomPlayer.bind(this);
    this.onRoomGame = this.onRoomGame.bind(this);
    this.onRoomConfigOpen = this.onRoomConfigOpen.bind(this);
    this.detach = this.detach.bind(this);

    this.callbacks = {
      emitAllRooms() {
        controller.emitAllRooms(this);
      },
      onCreateRoom(data: any) {
        controller.onCreateRoom(this, data[0], data[1]);
      },
      onJoinRoom(data: any) {
        controller.onJoinRoom(this, data[0], data[1]);
      },
    };

    this.repository.on('room:open', this.onRoomOpen);
    this.repository.on('room:close', this.onRoomClose);
  }

  attach(client: SocketClient): void {
    if (this.socketGroup.clients.add(client)) {
      this.attachEvents(client);
    }
  }

  detach(client: SocketClient): void {
    if (this.socketGroup.clients.remove(client)) {
      this.detachEvents(client);
    }
  }

  attachEvents(client: SocketClient): void {
    client.on('close', this.detach);
    client.on('room:fetch', this.callbacks.emitAllRooms);
    client.on('room:create', this.callbacks.onCreateRoom);
    client.on('room:join', this.callbacks.onJoinRoom);
  }

  detachEvents(client: SocketClient): void {
    client.removeListener('close', this.detach);
    client.removeListener('room:fetch', this.callbacks.emitAllRooms);
    client.removeListener('room:create', this.callbacks.onCreateRoom);
    client.removeListener('room:join', this.callbacks.onJoinRoom);
  }

  emitAllRooms(client: SocketClient): void {
    const events: any[] = [];
    for (let i = this.repository.rooms.items.length - 1; i >= 0; i--) {
      events.push(['room:open', this.repository.rooms.items[i]!.serialize(false)]);
    }
    client.addEvents(events);
  }

  onCreateRoom(_client: SocketClient, data: any, callback: (r: any) => void): void {
    const name = String(data.name).substr(0, Room.maxLength).trim();
    const room = this.repository.create(name);

    callback(room ? { success: true, room: room.serialize(false) } : { success: false });

    if (room) {
      this.emit('room:new', { room });
    }
  }

  onJoinRoom(client: SocketClient, data: any, callback: (r: any) => void): void {
    const room = this.repository.get(data.name);

    if (!room) {
      return callback({ success: false, error: `Unknown room "${data.name}".` });
    }

    const password = typeof data.password !== 'undefined' ? data.password : null;

    if (!room.config.allow(password)) {
      return callback({ success: false, error: 'Wrong password.' });
    }

    room.controller.attach(client, callback);
  }

  onRoomOpen(data: any): void {
    const room = data.room;

    room.on('game:new', this.onRoomGame);
    room.on('game:end', this.onRoomGame);
    room.on('player:join', this.onRoomPlayer);
    room.on('player:leave', this.onRoomPlayer);
    room.config.on('room:config:open', this.onRoomConfigOpen);

    this.socketGroup.addEvent('room:open', room.serialize(false));
  }

  onRoomClose(data: any): void {
    const room = data.room;

    room.removeListener('game:new', this.onRoomGame);
    room.removeListener('game:end', this.onRoomGame);
    room.removeListener('player:join', this.onRoomPlayer);
    room.removeListener('player:leave', this.onRoomPlayer);
    room.config.removeListener('room:config:open', this.onRoomConfigOpen);

    this.socketGroup.addEvent('room:close', { name: room.name });
  }

  onRoomConfigOpen(data: any): void {
    this.socketGroup.addEvent('room:config:open', { name: data.room.name, open: data.open });
  }

  onRoomPlayer(data: any): void {
    const room = data.room.serialize(false);
    this.socketGroup.addEvent('room:players', { name: room.name, players: room.players });
  }

  onRoomGame(data: any): void {
    const room = data.room.serialize(false);
    this.socketGroup.addEvent('room:game', { name: room.name, game: room.game });
  }
}
