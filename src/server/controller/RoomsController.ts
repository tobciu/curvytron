import { EventEmitter } from '#event-emitter';
import { SocketGroup } from '../core/SocketGroup.ts';
import { Room } from '../model/Room.ts';
import { invalidData, isShape, rules } from '../core/validate.ts';
import type { SocketClient } from '../core/SocketClient.ts';
import type { RoomRepository } from '../repository/RoomRepository.ts';
import type { ClientEvents, Reply } from '../../shared/protocol.ts';

/**
 * Rooms Controller
 */
export class RoomsController extends EventEmitter {
    socketGroup: SocketGroup;
    repository: RoomRepository;
    callbacks: Record<string, (this: SocketClient, data?: any) => void>;

    constructor(repository: RoomRepository) {
        super();

        this.socketGroup = new SocketGroup();
        this.repository = repository;

        this.onRoomOpen = this.onRoomOpen.bind(this);
        this.onRoomClose = this.onRoomClose.bind(this);
        this.onRoomPlayer = this.onRoomPlayer.bind(this);
        this.onRoomGame = this.onRoomGame.bind(this);
        this.onRoomConfigOpen = this.onRoomConfigOpen.bind(this);
        this.detach = this.detach.bind(this);

        this.callbacks = this.createCallbacks(this);

        this.repository.on('room:open', this.onRoomOpen);
        this.repository.on('room:close', this.onRoomClose);
    }

    /**
     * Socket event handlers: the emitter calls them with the client as this, the controller comes in as a parameter
     */
    createCallbacks(controller: RoomsController): RoomsController['callbacks'] {
        return {
            emitAllRooms: function () {
                controller.emitAllRooms(this);
            },
            onCreateRoom: function (this: SocketClient, data: any) {
                controller.onCreateRoom(this, data[0], data[1]);
            },
            onJoinRoom: function (this: SocketClient, data: any) {
                controller.onJoinRoom(this, data[0], data[1]);
            }
        };
    }

    /**
     * Attach events
     */
    attach(client: SocketClient) {
        if (this.socketGroup.clients.add(client)) {
            this.attachEvents(client);
        }
    }

    /**
     * Attach events
     */
    detach(client: SocketClient) {
        if (this.socketGroup.clients.remove(client)) {
            this.detachEvents(client);
        }
    }

    /**
     * Detach events
     */
    attachEvents(client: SocketClient) {
        client.on('close', this.detach);
        client.on('room:fetch', this.callbacks.emitAllRooms);
        client.on('room:create', this.callbacks.onCreateRoom);
        client.on('room:join', this.callbacks.onJoinRoom);
    }

    /**
     * Detach events
     */
    detachEvents(client: SocketClient) {
        client.removeListener('close', this.detach);
        client.removeListener('room:fetch', this.callbacks.emitAllRooms);
        client.removeListener('room:create', this.callbacks.onCreateRoom);
        client.removeListener('room:join', this.callbacks.onJoinRoom);
    }

    /**
     * Emit all rooms to the given client
     */
    emitAllRooms(client: SocketClient) {
        const events = [];

        for (let i = this.repository.rooms.items.length - 1; i >= 0; i--) {
            events.push(['room:open', this.repository.rooms.items[i].serialize(false)]);
        }

        client.addEvents(events);
    }

    // Events:

    /**
     * On new room
     */
    onCreateRoom(client: SocketClient, data: ClientEvents['room:create']['data'], callback?: Reply<'room:create'>) {
        if (!isShape(data, { name: rules.string() })) {
            return callback?.(invalidData);
        }

        const name = data.name.substring(0, Room.maxLength).trim(),
            room = this.repository.create(name);

        callback?.(room ? { success: true, room: room.serialize(false) } : { success: false });

        if (room) {
            this.emit('room:new', { room });
        }
    }

    /**
     * On join room
     */
    onJoinRoom(client: SocketClient, data: ClientEvents['room:join']['data'], callback?: Reply<'room:join'>) {
        if (!isShape(data, { name: rules.string(), password: rules.optional(rules.string(40)) })) {
            return callback?.(invalidData);
        }

        const room = this.repository.get(data.name);

        if (!room) {
            return callback?.({ success: false, error: `Unknown room "${data.name}".` });
        }

        const password = data.password ?? null;

        if (!room.config.allow(password)) {
            return callback?.({ success: false, error: 'Wrong password.' });
        }

        room.controller.attach(client, callback);
    }

    /**
     * On new room open
     */
    onRoomOpen(data: any) {
        const room = data.room;

        room.on('game:new', this.onRoomGame);
        room.on('game:end', this.onRoomGame);
        room.on('player:join', this.onRoomPlayer);
        room.on('player:leave', this.onRoomPlayer);
        room.config.on('room:config:open', this.onRoomConfigOpen);

        this.socketGroup.addEvent('room:open', room.serialize(false));
    }

    /**
     * On room close
     */
    onRoomClose(data: any) {
        const room = data.room;

        room.removeListener('game:new', this.onRoomGame);
        room.removeListener('game:end', this.onRoomGame);
        room.removeListener('player:join', this.onRoomPlayer);
        room.removeListener('player:leave', this.onRoomPlayer);
        room.config.on('room:config:open', this.onRoomConfigOpen);

        this.socketGroup.addEvent('room:close', { name: room.name });
    }

    /**
     * On room config open
     */
    onRoomConfigOpen(data: any) {
        this.socketGroup.addEvent('room:config:open', { name: data.room.name, open: data.open });
    }

    /**
     * On player leave/join a room
     */
    onRoomPlayer(data: any) {
        const room = data.room.serialize(false);

        this.socketGroup.addEvent('room:players', { name: room.name, players: room.players });
    }

    /**
     * On room start/end a game
     */
    onRoomGame(data: any) {
        const room = data.room.serialize(false);

        this.socketGroup.addEvent('room:game', { name: room.name, game: room.game });
    }
}
