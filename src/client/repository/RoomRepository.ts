import { EventEmitter } from '#event-emitter';
import { Client } from '../model/Client.ts';
import { Player } from '../model/Player.ts';
import { Room } from '../model/Room.ts';
import { Collection } from '../../shared/Collection.ts';
import type { SocketClient } from '../core/SocketClient.ts';
import type { ServerEvent } from '../../shared/protocol.ts';

/**
 * RoomRepository
 */
export class RoomRepository extends EventEmitter {
    client: SocketClient;
    room: any;
    master: any;
    clients: any;
    playerCache: Collection;

    constructor(client: SocketClient) {
        super();

        this.client = client;
        this.room = null;
        this.master = null;
        this.clients = new Collection();
        this.playerCache = new Collection();

        this.start = this.start.bind(this);
        this.onClientAdd = this.onClientAdd.bind(this);
        this.onClientRemove = this.onClientRemove.bind(this);
        this.onRoomMaster = this.onRoomMaster.bind(this);
        this.onJoinRoom = this.onJoinRoom.bind(this);
        this.onLeaveRoom = this.onLeaveRoom.bind(this);
        this.onGameStart = this.onGameStart.bind(this);
        this.onPlayerReady = this.onPlayerReady.bind(this);
        this.onPlayerColor = this.onPlayerColor.bind(this);
        this.onPlayerName = this.onPlayerName.bind(this);
        this.onConfigOpen = this.onConfigOpen.bind(this);
        this.onConfigMaxScore = this.onConfigMaxScore.bind(this);
        this.onConfigVariable = this.onConfigVariable.bind(this);
        this.onConfigBonus = this.onConfigBonus.bind(this);
        this.onKick = this.onKick.bind(this);
        this.onVote = this.onVote.bind(this);
        this.onClientActivity = this.onClientActivity.bind(this);
        this.onPlayerConnection = this.onPlayerConnection.bind(this);
        this.forwardEvent = this.forwardEvent.bind(this);
    }

    /**
     * Attach events
     */
    attachEvents() {
        this.client.on('client:add', this.onClientAdd);
        this.client.on('client:remove', this.onClientRemove);
        this.client.on('room:master', this.onRoomMaster);
        this.client.on('room:join', this.onJoinRoom);
        this.client.on('room:leave', this.onLeaveRoom);
        this.client.on('room:game:start', this.onGameStart);
        this.client.on('player:ready', this.onPlayerReady);
        this.client.on('player:color', this.onPlayerColor);
        this.client.on('player:name', this.onPlayerName);
        this.client.on('player:connection', this.onPlayerConnection);
        this.client.on('room:config:open', this.onConfigOpen);
        this.client.on('room:config:max-score', this.onConfigMaxScore);
        this.client.on('room:config:variable', this.onConfigVariable);
        this.client.on('room:config:bonus', this.onConfigBonus);
        this.client.on('room:launch:start', this.forwardEvent);
        this.client.on('room:launch:cancel', this.forwardEvent);
        this.client.on('room:kick', this.onKick);
        this.client.on('vote:new', this.onVote);
        this.client.on('vote:close', this.onVote);
        this.client.on('client:activity', this.onClientActivity);
    }

    /**
     * Attach events
     */
    detachEvents() {
        this.client.off('client:add', this.onClientAdd);
        this.client.off('client:remove', this.onClientRemove);
        this.client.off('room:master', this.onRoomMaster);
        this.client.off('room:join', this.onJoinRoom);
        this.client.off('room:leave', this.onLeaveRoom);
        this.client.off('room:game:start', this.onGameStart);
        this.client.off('player:ready', this.onPlayerReady);
        this.client.off('player:color', this.onPlayerColor);
        this.client.off('player:name', this.onPlayerName);
        this.client.off('player:connection', this.onPlayerConnection);
        this.client.off('room:config:open', this.onConfigOpen);
        this.client.off('room:config:max-score', this.onConfigMaxScore);
        this.client.off('room:config:variable', this.onConfigVariable);
        this.client.off('room:config:bonus', this.onConfigBonus);
        this.client.off('room:launch:start', this.forwardEvent);
        this.client.off('room:launch:cancel', this.forwardEvent);
        this.client.off('room:kick', this.onKick);
        this.client.off('vote:new', this.onVote);
        this.client.off('vote:close', this.onVote);
        this.client.off('client:activity', this.onClientActivity);
    }

    /**
     * Join room
     */
    join(name: string, password: string | null, callback: (...args: any[]) => any) {
        if (this.room?.name === name) {
            return callback({ success: true, room: this.room });
        }

        this.client.addEvent('room:join', { name, password }, (result) => {
            if (result.success) {
                const clients = this.createClients(result.clients),
                    master = clients.getById(result.master),
                    room = this.createRoom(result.room, clients),
                    messages = result.messages.length;

                this.setRoom(room, clients, master);
                callback({ success: true, room });

                for (let m = 0; m < messages; m++) {
                    this.client.emit('room:talk', result.messages[m]);
                }

                for (let v = result.votes.length - 1; v >= 0; v--) {
                    this.client.emit('vote:new', result.votes[v]);
                }
            } else {
                callback({
                    success: false,
                    name,
                    error: result.error ?? 'Unknown error'
                });
            }
        });
    }

    /**
     * Create clients
     */
    createClients(data: any[]) {
        const clients = new Collection();

        for (let i = data.length - 1; i >= 0; i--) {
            clients.add(new Client(data[i].id, data[i].active));
        }

        return clients;
    }

    /**
     * Create room rom server data
     */
    createRoom(data: any, clients: Collection) {
        const room = new Room(data.name),
            length = data.players.length;

        for (let client, i = 0; i < length; i++) {
            client = clients.getById(data.players[i].client);

            if (client) {
                const player = new Player(
                    data.players[i].id,
                    client,
                    data.players[i].name,
                    data.players[i].color,
                    data.players[i].ready
                );

                player.online = data.players[i].online !== false;
                room.addPlayer(player);
            } else {
                console.error('Could not find a client:', data.players[i].client, clients);
            }
        }

        room.config.setOpen(data.config.open);
        room.config.setPassword(data.config.password);
        room.config.setMaxScore(data.config.maxScore);

        for (const variable in data.config.variables) {
            if (Object.hasOwn(data.config.variables, variable)) {
                room.config.setVariable(variable, data.config.variables[variable]);
            }
        }

        for (const bonus in data.config.bonuses) {
            if (Object.hasOwn(data.config.bonuses, bonus)) {
                room.config.setBonus(bonus, data.config.bonuses[bonus]);
            }
        }

        return room;
    }

    /**
     * Set current room
     */
    setRoom(room: Room | null, clients: Collection<Client>, master: Client | null) {
        if (!this.room?.equal(room)) {
            this.room = room;
            this.clients = clients;
            this.emit(this.room ? 'room:join' : 'room:leave');
            this.setRoomMaster(master);
        }
    }

    /**
     * Set room master
     */
    setRoomMaster(master: Client | null) {
        if (this.master) {
            this.master.setMaster(false);
        }

        this.master = master;

        if (this.master) {
            this.master.setMaster(true);
        }

        this.emit('room:master', { master: this.master });
    }

    /**
     * Am I the room master?
     */
    amIMaster(): boolean {
        const client = this.clients.getById(this.client.id);

        return !!client?.master;
    }

    /**
     * Add player
     */
    addPlayer(name: string, color: any, callback: (...args: any[]) => any) {
        this.client.addEvent(
            'player:add',
            {
                name: name.substring(0, Player.maxLength),
                color: color ? color.substring(0, Player.colorMaxLength) : null
            },
            callback
        );
    }

    /**
     * Remove player
     */
    removePlayer(player: Player, callback: (...args: any[]) => any) {
        this.client.addEvent('player:remove', { player: player.id }, callback);
    }

    /**
     * Kick player
     */
    kickPlayer(player: Player, callback: (...args: any[]) => any) {
        this.client.addEvent('player:kick', { player: player.id }, function (result) {
            player.kicked = 'kicked' in result && result.kicked;
            callback(result);
        });
    }

    /**
     * Leave
     */
    leave() {
        this.client.addEvent('room:leave');
        this.stop();
        this.emit('room:leave');
    }

    /**
     * Set color
     */
    setColor(player: Player, color: string, callback: (...args: any[]) => any) {
        this.client.addEvent(
            'room:color',
            {
                player: player.id,
                color: color.substring(0, Player.colorMaxLength)
            },
            function (result) {
                if (!result.success) {
                    console.error('Could not set color %s for player %s', player.color, player.name);
                }
                player.color = ('color' in result ? result.color : undefined) ?? player.color;
                callback(result);
            }
        );
    }

    /**
     * Set name
     */
    setName(player: number, name: string, callback: (...args: any[]) => any) {
        name = name.substring(0, Player.maxLength).trim();

        this.client.addEvent('room:name', { player, name }, callback);
    }

    /**
     * Set ready
     */
    setReady(player: number, callback: (...args: any[]) => any) {
        this.client.addEvent('room:ready', { player }, callback);
    }

    /**
     * Set config open
     */
    setConfigOpen(open: boolean, callback: (...args: any[]) => any) {
        this.client.addEvent('room:config:open', { open: !!open }, callback);
    }

    /**
     * Set config max score
     */
    setConfigMaxScore(maxScore: number, callback: (...args: any[]) => any) {
        this.client.addEvent('room:config:max-score', { maxScore: Number.parseInt(String(maxScore), 10) }, callback);
    }

    /**
     * Set config speed
     */
    setConfigVariable(variable: any, value: any, callback: (...args: any[]) => any) {
        this.client.addEvent('room:config:variable', { variable, value: Number.parseFloat(value) }, callback);
    }

    /**
     * Set config bonus
     */
    setConfigBonus(bonus: string, callback: (...args: any[]) => any) {
        this.client.addEvent('room:config:bonus', { bonus }, callback);
    }

    /**
     * Launch
     */
    launch() {
        this.client.addEvent('room:launch');
    }

    // EVENTS:

    /**
     * On client add
     */
    onClientAdd(e: ServerEvent<'client:add'>) {
        this.clients.add(new Client(e.detail));
    }

    /**
     * On client remove
     */
    onClientRemove(e: ServerEvent<'client:remove'>) {
        this.clients.removeById(e.detail);
    }

    /**
     * On join room
     */
    onJoinRoom(e: ServerEvent<'room:join'>): void {
        const data = e.detail,
            player = new Player(
                data.player.id,
                this.clients.getById(data.player.client),
                data.player.name,
                data.player.color,
                data.player.ready
            );

        player.online = data.player.online !== false;

        if (this.room.addPlayer(player)) {
            this.emit('player:join', { player });
        }
    }

    /**
     * On leave room
     */
    onLeaveRoom(e: ServerEvent<'room:leave'>): void {
        const player = this.room.players.getById(e.detail.player);

        if (player && this.room.removePlayer(player)) {
            this.playerCache.add(player);
            this.emit('player:leave', { player });
        }
    }

    /**
     * On client changes activity
     */
    onClientActivity(e: ServerEvent<'client:activity'>): void {
        const client = this.clients.getById(e.detail.client);

        if (client) {
            client.active = e.detail.active;
            this.emit('client:activity', { client, active: client.active });
        }
    }

    /**
     * A player lost the connection, or is back
     */
    onPlayerConnection(e: ServerEvent<'player:connection'>) {
        const player = this.room?.players.getById(e.detail.player);

        if (player) {
            player.online = e.detail.online;
            this.emit('player:connection', { player, online: player.online });
        }
    }

    /**
     * On player change color
     */
    onPlayerColor(e: ServerEvent<'player:color'>) {
        const data = e.detail,
            player = this.room.players.getById(data.player);

        if (player) {
            player.setColor(data.color);
            this.emit('player:color', { player });
        }
    }

    /**
     * On player change name
     */
    onPlayerName(e: ServerEvent<'player:name'>) {
        const data = e.detail,
            player = this.room.players.getById(data.player);

        if (player) {
            player.setName(data.name);
            this.emit('player:name', { player });
        }
    }

    /**
     * On player toggle ready
     */
    onPlayerReady(e: ServerEvent<'player:ready'>) {
        const data = e.detail,
            player = this.room.players.getById(data.player);

        if (player) {
            player.toggleReady(data.ready);
            this.emit('player:ready', { player });
        }
    }

    /**
     * On game master
     */
    onRoomMaster(e: ServerEvent<'room:master'>) {
        const master = this.clients.getById(e.detail.client);

        if (master) {
            this.setRoomMaster(master);
        }
    }

    /**
     * On config open
     */
    onConfigOpen(e: ServerEvent<'room:config:open'>) {
        const data = e.detail;

        this.room.config.setOpen(data.open);
        this.room.config.setPassword(data.password);

        this.emit('room:config:open', { open: data.open, password: data.password });
    }

    /**
     * On config max score
     */
    onConfigMaxScore(e: ServerEvent<'room:config:max-score'>) {
        const data = e.detail;

        this.room.config.setMaxScore(data.maxScore);
        this.emit('config:max-score', { maxScore: data.maxScore });
    }

    /**
     * On config variable
     */
    onConfigVariable(e: ServerEvent<'room:config:variable'>) {
        const data = e.detail;

        this.room.config.setVariable(data.variable, data.value);
        this.emit('config:variable', { variable: data.variable, value: data.value });
    }

    /**
     * On config bonus
     */
    onConfigBonus(e: ServerEvent<'room:config:bonus'>) {
        const data = e.detail;

        this.room.config.setBonus(data.bonus, data.enabled);
        this.emit('config:bonus', { bonus: data.bonus, enabled: data.enabled });
    }

    /**
     * On room game start
     */
    onGameStart(e: ServerEvent<'room:game:start'>) {
        this.room.newGame();
        this.emit('room:game:start');
    }

    /**
     * On vote
     */
    onVote(e: any) {
        let player = this.room.players.getById(e.detail.target);

        if (!player) {
            player = this.playerCache.getById(e.detail.target);
        }

        if (player) {
            player.vote = e.type === 'vote:new';
            this.emit(e.type, { target: player, result: e.detail.result });
        }
    }

    /**
     * On kick
     */
    onKick(e: ServerEvent<'room:kick'>) {
        let player = this.room.players.getById(e.detail);

        if (!player) {
            player = this.playerCache.getById(e.detail);
        }

        if (player) {
            this.emit(e.type, player);
        }
    }

    /**
     * Forward event
     */
    forwardEvent(e: any) {
        this.emit(e.type, e.detail);
    }

    /**
     * Start
     */
    start() {
        if (this.client.connected) {
            this.attachEvents();
        } else {
            this.client.on('connected', this.start);
        }
    }

    /**
     * Pause
     */
    stop() {
        this.detachEvents();
        this.playerCache.clear();
        this.setRoom(null, new Collection(), null);
    }
}
