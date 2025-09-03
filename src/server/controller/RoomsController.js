import EventEmitter from 'tom32i-event-emitter.js';
import SocketGroup from '../core/SocketGroup.js';
import Room from '../model/Room.js';

/**
 * Rooms Controller
 */
class RoomsController extends EventEmitter {
    constructor(repository) {
        super();

        this.socketGroup = new SocketGroup();
        this.repository = repository;

        this.onRoomOpen = this.onRoomOpen.bind(this);
        this.onRoomClose = this.onRoomClose.bind(this);
        this.onRoomPlayer = this.onRoomPlayer.bind(this);
        this.onRoomGame = this.onRoomGame.bind(this);
        this.onRoomConfigOpen = this.onRoomConfigOpen.bind(this);
        this.detach = this.detach.bind(this);

        this.callbacks = {
            emitAllRooms: () => this.emitAllRooms(this),
            onCreateRoom: (data) => this.onCreateRoom(this, data[0], data[1]),
            onJoinRoom: (data) => this.onJoinRoom(this, data[0], data[1])
        };

        this.repository.on('room:open', this.onRoomOpen);
        this.repository.on('room:close', this.onRoomClose);
    }

    /**
     * Attach events
     *
     * @param {SocketClient} client
     */
    attach(client) {
        if (this.socketGroup.clients.add(client)) {
            this.attachEvents(client);
        }
    }

    /**
     * Attach events
     *
     * @param {SocketClient} client
     */
    detach(client) {
        if (this.socketGroup.clients.remove(client)) {
            this.detachEvents(client);
        }
    }

    /**
     * Detach events
     *
     * @param {SocketClient} client
     */
    attachEvents(client) {
        client.on('close', this.detach);
        client.on('room:fetch', this.callbacks.emitAllRooms);
        client.on('room:create', this.callbacks.onCreateRoom);
        client.on('room:join', this.callbacks.onJoinRoom);
    }

    /**
     * Detach events
     *
     * @param {SocketClient} client
     */
    detachEvents(client) {
        client.removeListener('close', this.detach);
        client.removeListener('room:fetch', this.callbacks.emitAllRooms);
        client.removeListener('room:create', this.callbacks.onCreateRoom);
        client.removeListener('room:join', this.callbacks.onJoinRoom);
    }

    /**
     * Emit all rooms to the given client
     *
     * @param {SocketClient} client
     */
    emitAllRooms(client) {
        const events = [];

        for (let i = this.repository.rooms.items.length - 1; i >= 0; i--) {
            events.push(['room:open', this.repository.rooms.items[i].serialize(false)]);
        }

        client.addEvents(events);
    }

    /**
     * On new room
     *
     * @param {SocketClient} client
     * @param {Object} data
     * @param {Function} callback
     */
    onCreateRoom(client, data, callback) {
        const name = data.name.substr(0, Room.prototype.maxLength).trim();
        const room = this.repository.create(name);

        callback(room ? { success: true, room: room.serialize(false) } : { success: false });

        if (room) {
            this.emit('room:new', { room: room });
        }
    }

    /**
     * On join room
     *
     * @param {SocketClient} client
     * @param {Object} data
     * @param {Function} callback
     */
    onJoinRoom(client, data, callback) {
        const room = this.repository.get(data.name);

        if (!room) {
            return callback({ success: false, error: 'Unknown room "' + data.name + '".' });
        }

        const password = typeof (data.password) !== 'undefined' ? data.password : null;

        if (!room.config.allow(password)) {
            return callback({ success: false, error: 'Wrong password.' });
        }

        room.controller.attach(client, callback);
    }

    /**
     * On new room open
     *
     * @param {Object} data
     */
    onRoomOpen(data) {
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
     *
     * @param {Object} data
     */
    onRoomClose(data) {
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
     *
     * @param {Object} data
     */
    onRoomConfigOpen(data) {
        this.socketGroup.addEvent('room:config:open', { name: data.room.name, open: data.open });
    }

    /**
     * On player leave/join a room
     *
     * @param {Object} data
     */
    onRoomPlayer(data) {
        const room = data.room.serialize(false);
        this.socketGroup.addEvent('room:players', { name: room.name, players: room.players });
    }

    /**
     * On room start/end a game
     *
     * @param {Object} data
     */
    onRoomGame(data) {
        const room = data.room.serialize(false);
        this.socketGroup.addEvent('room:game', { name: room.name, game: room.game });
    }
}

export default RoomsController;
