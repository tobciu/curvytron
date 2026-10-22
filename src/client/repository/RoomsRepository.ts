import { EventEmitter } from '#event-emitter';
import { Room } from '../model/Room.ts';
import { RoomListItem } from '../model/RoomListItem.ts';
import { Collection } from '../../shared/Collection.ts';
import type { SocketClient } from '../core/SocketClient.ts';
import type { ServerEvent } from '../../shared/protocol.ts';

/**
 * RoomsRepository
 */
export class RoomsRepository extends EventEmitter {
    client: SocketClient;
    rooms: Collection;

    constructor(client: SocketClient) {
        super();

        this.client = client;
        this.rooms = new Collection([], 'name');

        this.start = this.start.bind(this);
        this.onRoomOpen = this.onRoomOpen.bind(this);
        this.onRoomClose = this.onRoomClose.bind(this);
        this.onRoomPlayers = this.onRoomPlayers.bind(this);
        this.onRoomGame = this.onRoomGame.bind(this);
        this.onRoomConfigOpen = this.onRoomConfigOpen.bind(this);
    }

    /**
     * Attach events
     */
    attachEvents() {
        this.client.on('room:open', this.onRoomOpen);
        this.client.on('room:close', this.onRoomClose);
        this.client.on('room:players', this.onRoomPlayers);
        this.client.on('room:game', this.onRoomGame);
        this.client.on('room:config:open', this.onRoomConfigOpen);
    }

    /**
     * Attach events
     */
    detachEvents() {
        this.client.off('room:open', this.onRoomOpen);
        this.client.off('room:close', this.onRoomClose);
        this.client.off('room:players', this.onRoomPlayers);
        this.client.off('room:game', this.onRoomGame);
        this.client.off('room:config:open', this.onRoomConfigOpen);
    }

    /**
     * Get all
     */
    all() {
        return this.rooms;
    }

    /**
     * Get all
     */
    get(name: any) {
        return this.rooms.getById(name);
    }

    /**
     * Create
     */
    create(name?: string, tag?: string, callback?: (...args: any[]) => any) {
        // Without a name the server picks one; the server cleans the tag
        this.client.addEvent(
            'room:create',
            { name: (name ?? '').substring(0, Room.maxLength).trim(), tag: (tag ?? '').trim() || undefined },
            callback
        );
    }

    /**
     * Create room proxy object from data
     */
    createRoom(data: any) {
        return new RoomListItem(data.name, data.players, data.game, data.open, data.tag ?? null);
    }

    // EVENTS:

    /**
     * On room open
     */
    onRoomOpen(e: ServerEvent<'room:open'>): void {
        const room = this.createRoom(e.detail);

        if (this.rooms.add(room)) {
            this.emit('room:open', { room });
        }
    }

    /**
     * On close room
     */
    onRoomClose(e: ServerEvent<'room:close'>): void {
        const room = this.get(e.detail.name);

        if (room && this.rooms.remove(room)) {
            this.emit('room:close', room);
        }
    }

    /**
     * On room config open change
     */
    onRoomConfigOpen(e: ServerEvent<'room:config:open'>): void {
        const room = this.get(e.detail.name);

        if (room) {
            room.open = e.detail.open;
            this.emit('room:config:open', room);
        }
    }

    /**
     * On room players change
     */
    onRoomPlayers(e: ServerEvent<'room:players'>): void {
        const room = this.get(e.detail.name);

        if (room) {
            room.players = e.detail.players;
            this.emit('room:players', room);
        }
    }

    /**
     * On room game change
     */
    onRoomGame(e: ServerEvent<'room:game'>): void {
        const room = this.get(e.detail.name);

        if (room) {
            room.game = e.detail.game;
            this.emit('room:game', room);
        }
    }

    /**
     * Start
     */
    start() {
        if (this.client.connected) {
            this.attachEvents();
            this.client.addEvent('room:fetch');
        } else {
            this.client.on('connected', this.start);
        }
    }

    /**
     * Pause
     */
    stop() {
        this.detachEvents();
        this.rooms.clear();
    }
}
