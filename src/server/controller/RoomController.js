import EventEmitter from 'tom32i-event-emitter.js';
import Collection from '../../shared/Collection.js';
import SocketGroup from '../core/SocketGroup.js';
import KickManager from '../manager/KickManager.js';
import Chat from '../service/Chat.js';
import Player from '../model/Player.js';
import Message from '../model/Message.js';

/**
 * Room Controller
 */
class RoomController extends EventEmitter {
    /**
     * Time before closing an empty room
     *
     * @type {Number}
     */
    timeToClose = 10000;

    constructor(room) {
        super();

        this.room = room;
        this.clients = new Collection();
        this.socketGroup = new SocketGroup(this.clients);
        this.kickManager = new KickManager(this);
        this.chat = new Chat();
        this.roomMaster = null;
        this.launching = null;

        this.onPlayerJoin = this.onPlayerJoin.bind(this);
        this.onPlayerLeave = this.onPlayerLeave.bind(this);
        this.onGame = this.onGame.bind(this);
        this.loadRoom = this.loadRoom.bind(this);
        this.unloadRoom = this.unloadRoom.bind(this);
        this.onVoteNew = this.onVoteNew.bind(this);
        this.onVoteClose = this.onVoteClose.bind(this);
        this.onKick = this.onKick.bind(this);
        this.checkForClose = this.checkForClose.bind(this);
        this.removeRoomMaster = this.removeRoomMaster.bind(this);
        this.onPlayersClear = this.onPlayersClear.bind(this);
        this.launch = this.launch.bind(this);

        this.callbacks = {
            onTalk: (data) => this.onTalk(this, data[0], data[1]),
            onPlayerAdd: (data) => this.onPlayerAdd(this, data[0], data[1]),
            onPlayerRemove: (data) => this.onPlayerRemove(this, data[0], data[1]),
            onReady: (data) => this.onReady(this, data[0], data[1]),
            onKickVote: (data) => this.onKickVote(this, data[0], data[1]),
            onName: (data) => this.onName(this, data[0], data[1]),
            onColor: (data) => this.onColor(this, data[0], data[1]),
            onLeave: () => this.onLeave(this),
            onActivity: () => this.onActivity(this),
            onConfigOpen: (data) => this.onConfigOpen(this, data[0], data[1]),
            onConfigMaxScore: (data) => this.onConfigMaxScore(this, data[0], data[1]),
            onConfigVariable: (data) => this.onConfigVariable(this, data[0], data[1]),
            onConfigBonus: (data) => this.onConfigBonus(this, data[0], data[1]),
            onLaunch: () => this.onLaunch(this)
        };

        this.loadRoom();
        this.promptCheckForClose();
    }

    /**
     * Load room
     */
    loadRoom() {
        this.room.on('close', this.unloadRoom);
        this.room.on('player:join', this.onPlayerJoin);
        this.room.on('player:leave', this.onPlayerLeave);
        this.room.on('game:new', this.onGame);
        this.kickManager.on('kick', this.onKick);
        this.kickManager.on('vote:new', this.onVoteNew);
        this.kickManager.on('vote:close', this.onVoteClose);
    }

    /**
     * Load room
     */
    unloadRoom() {
        this.room.removeListener('close', this.unloadRoom);
        this.room.removeListener('player:join', this.onPlayerJoin);
        this.room.removeListener('player:leave', this.onPlayerLeave);
        this.room.removeListener('game:new', this.onGame);
        this.kickManager.removeListener('kick', this.onKick);
        this.kickManager.removeListener('vote:new', this.onVoteNew);
        this.kickManager.removeListener('vote:close', this.onVoteClose);
        this.kickManager.clear();
    }

    /**
     * Attach events
     *
     * @param {SocketClient} client
     * @param {Function} callback
     */
    attach(client, callback) {
        if (this.clients.add(client)) {
            this.attachEvents(client);
            this.onClientAdd(client);
            callback({
                success: true,
                room: this.room.serialize(),
                master: this.roomMaster ? this.roomMaster.id : null,
                clients: this.clients.map(function () { return this.serialize(); }).items,
                messages: this.chat.serialize(100),
                votes: this.kickManager.votes.map(function () { return this.serialize(); }).items
            });
            this.socketGroup.addEvent('client:add', client.id);
            this.emit('client:add', { room: this.room, client: client });
        } else {
            callback({ success: false, error: 'Client ' + client.id + ' already in the room.' });
        }
        this.checkIntegrity();
    }

    /**
     * Attach events
     *
     * @param {SocketClient} client
     */
    detach(client) {
        if (this.clients.remove(client)) {
            if (this.room.game) {
                this.room.game.controller.detach(client);
            }

            client.clearPlayers();
            this.detachEvents(client);
            this.promptCheckForClose();
            this.socketGroup.addEvent('client:remove', client.id);
            this.emit('client:remove', { room: this.room, client: client });
        }
        this.checkIntegrity();
    }

    /**
     * Detach events
     *
     * @param {SocketClient} client
     */
    attachEvents(client) {
        client.on('close', this.callbacks.onLeave);
        client.on('activity', this.callbacks.onActivity);
        client.on('room:leave', this.callbacks.onLeave);
        client.on('room:talk', this.callbacks.onTalk);
        client.on('player:add', this.callbacks.onPlayerAdd);
        client.on('player:remove', this.callbacks.onPlayerRemove);
        client.on('player:kick', this.callbacks.onKickVote);
        client.on('room:ready', this.callbacks.onReady);
        client.on('room:color', this.callbacks.onColor);
        client.on('room:name', this.callbacks.onName);
        client.on('players:clear', this.onPlayersClear);
    }

    /**
     * Detach events
     *
     * @param {SocketClient} client
     */
    detachEvents(client) {
        client.removeListener('close', this.callbacks.onLeave);
        client.removeListener('activity', this.callbacks.onActivity);
        client.removeListener('room:leave', this.callbacks.onLeave);
        client.removeListener('room:talk', this.callbacks.onTalk);
        client.removeListener('player:add', this.callbacks.onPlayerAdd);
        client.removeListener('player:remove', this.callbacks.onPlayerRemove);
        client.removeListener('player:kick', this.callbacks.onKickVote);
        client.removeListener('room:ready', this.callbacks.onReady);
        client.removeListener('room:color', this.callbacks.onColor);
        client.removeListener('room:name', this.callbacks.onName);
        client.removeListener('players:clear', this.onPlayersClear);
    }

    /**
     * Remove player
     *
     * @param {Player} player
     */
    removePlayer(player) {
        const client = player.client;

        if (this.room.removePlayer(player) && client) {
            client.players.remove(player);

            if (!client.isPlaying()) {
                this.kickManager.removeClient(client);

                if (this.roomMaster && this.roomMaster.id === client.id) {
                    this.removeRoomMaster();
                }
            }
        }
    }

    /**
     * Nominate game master
     */
    nominateRoomMaster() {
        if (this.clients.isEmpty() || this.roomMaster) { return; }

        const roomMaster = this.clients.match(function () { return this.active && this.isPlaying(); });

        this.setRoomMaster(roomMaster);
    }

    /**
     * Set game master
     *
     * @param {SocketClient} client
     */
    setRoomMaster(client) {
        if (!this.roomMaster && client) {
            this.roomMaster = client;
            this.roomMaster.on('close', this.removeRoomMaster);
            this.roomMaster.on('room:leave', this.removeRoomMaster);
            this.roomMaster.on('room:config:open', this.callbacks.onConfigOpen);
            this.roomMaster.on('room:config:max-score', this.callbacks.onConfigMaxScore);
            this.roomMaster.on('room:config:variable', this.callbacks.onConfigVariable);
            this.roomMaster.on('room:config:bonus', this.callbacks.onConfigBonus);
            this.roomMaster.on('room:launch', this.callbacks.onLaunch);
            this.socketGroup.addEvent('room:master', { client: client.id });
        }
    }

    /**
     * Remove game master
     */
    removeRoomMaster() {
        if (this.roomMaster) {
            this.roomMaster.removeListener('close', this.removeRoomMaster);
            this.roomMaster.removeListener('room:leave', this.removeRoomMaster);
            this.roomMaster.removeListener('room:config:open', this.callbacks.onConfigOpen);
            this.roomMaster.removeListener('room:config:max-score', this.callbacks.onConfigMaxScore);
            this.roomMaster.removeListener('room:config:variable', this.callbacks.onConfigVariable);
            this.roomMaster.removeListener('room:config:bonus', this.callbacks.onConfigBonus);
            this.roomMaster.removeListener('room:launch', this.callbacks.onLaunch);
            this.roomMaster = null;
            this.nominateRoomMaster();
        }
    }

    /**
     * Is the given client the game master?
     *
     * @param {SocketClient} client
     *
     * @return {Boolean}
     */
    isRoomMaster(client) {
        return this.roomMaster.id === client.id;
    }

    /**
     * Initialise a new client
     *
     * @param {SocketClient} client
     */
    onClientAdd(client) {
        client.clearPlayers();

        if (this.room.game) {
            this.room.game.controller.attach(client);
            client.addEvent('room:game:start');
        }

        this.socketGroup.addEvent('client:add', { client: client.serialize() });
        this.nominateRoomMaster();
    }

    /**
     * Prompt a check for close
     */
    promptCheckForClose() {
        if (this.clients.isEmpty()) {
            setTimeout(this.checkForClose, this.timeToClose);
        }
    }

    /**
     * Check is room is empty and shoul be closed
     */
    checkForClose() {
        if (this.clients.isEmpty()) {
            this.room.close();
        }
    }

    /**
     * Check integrity
     */
    checkIntegrity() {
        for (let i = this.room.players.items.length - 1; i >= 0; i--) {
            const player = this.room.players.items[i];
            if (!player.client || !this.clients.exists(player.client)) {
                console.error('"Lost" player removed.');
                this.removePlayer(player);
            }
        }
    }

    /**
     * Start launch
     */
    startLaunch() {
        if (!this.launching) {
            this.launching = setTimeout(this.launch, this.room.launchTime);
            this.socketGroup.addEvent('room:launch:start');
        }
    }

    /**
     * Cancel launch
     */
    cancelLaunch() {
        if (this.launching) {
            this.launching = clearTimeout(this.launching);
            this.socketGroup.addEvent('room:launch:cancel');
        }
    }

    /**
     * Launch
     */
    launch() {
        if (this.launching) {
            this.launching = clearTimeout(this.launching);
        }
        this.room.newGame();
    }

    /**
     * On client leave
     *
     * @param {SocketClient} client
     */
    onLeave(client) {
        this.detach(client);
    }

    /**
     * On client clear players
     *
     * @param {SocketClient} client
     */
    onPlayersClear(client) {
        for (let i = client.players.items.length - 1; i >= 0; i--) {
            this.removePlayer(client.players.items[i]);
        }
    }

    /**
     * On client activity change
     *
     * @param {SocketClient} client
     */
    onActivity(client) {
        this.socketGroup.addEvent('client:activity', {
            client: client.id,
            active: client.active
        });
    }

    /**
     * On add player to room
     *
     * @param {SocketClient} client
     * @param {Object} data
     * @param {Function} callback
     */
    onPlayerAdd(client, data, callback) {
        const name = data.name.substr(0, Player.prototype.maxLength).trim();
        const color = typeof (data.color) !== 'undefined' ? data.color : null;

        if (!name.length) {
            return callback({ success: false, error: 'Invalid name.' });
        }

        if (this.room.game) {
            return callback({ success: false, error: 'Game already started.' });
        }

        if (!this.room.isNameAvailable(name)) {
            return callback({ success: false, error: 'This username is already used.' });
        }

        if (!this.clients.exists(client)) {
            console.error('Unknown client.');
            return callback({ success: false, error: 'Unknown client' });
        }

        const player = new Player(client, name, color);

        if (this.room.addPlayer(player)) {
            client.players.add(player);
            this.emit('player:add', { room: this.room, player: player });
            callback({ success: true });
            this.nominateRoomMaster();
        } else {
            return callback({ success: false, error: 'Could not add player.' });
        }
    }

    /**
     * On remove player from room
     *
     * @param {SocketClient} client
     * @param {Object} data
     * @param {Function} callback
     */
    onPlayerRemove(client, data, callback) {
        const player = client.players.getById(data.player);

        if (player) {
            this.removePlayer(player);
            this.emit('player:remove', { room: this.room, player: player });
        }

        callback({ success: !!player });
    }

    /**
     * On talk
     *
     * @param {SocketClient} client
     * @param {String} content
     * @param {Function} callback
     */
    onTalk(client, content, callback) {
        const message = new Message(client, content.substr(0, Message.prototype.maxLength));
        const success = this.chat.addMessage(message);

        callback({ success: success });

        if (success) {
            this.socketGroup.addEvent('room:talk', message.serialize());
        }
    }

    /**
     * On player change color
     *
     * @param {SocketClient} client
     * @param {Object} data
     * @param {Function} callback
     */
    onColor(client, data, callback) {
        const player = client.players.getById(data.player);
        const color = data.color;

        if (!player) {
            return callback({ success: false });
        }

        if (player.setColor(color)) {
            callback({ success: true, color: player.color });
            this.socketGroup.addEvent('player:color', { player: player.id, color: player.color });
        } else {
            callback({ success: false, color: player.color });
        }
    }

    /**
     * On player change name
     *
     * @param {SocketClient} client
     * @param {Object} data
     * @param {Function} callback
     */
    onName(client, data, callback) {
        const player = client.players.getById(data.player);
        const name = data.name.substr(0, Player.prototype.maxLength).trim();

        if (!player) {
            return callback({ success: false, error: 'Unknown player: "' + name + '"' });
        }

        if (!name.length) {
            return callback({ success: false, error: 'Invalid name.', name: player.name });
        }

        if (!this.room.isNameAvailable(name)) {
            return callback({ success: false, error: 'This username is already used.', name: player.name });
        }

        player.setName(name);
        callback({ success: true, name: player.name });
        this.socketGroup.addEvent('player:name', { player: player.id, name: player.name });
    }

    /**
     * On player ready
     *
     * @param {SocketClient} client
     * @param {Object} data
     * @param {Function} callback
     */
    onReady(client, data, callback) {
        const player = client.players.getById(data.player);

        if (player) {
            player.toggleReady();

            callback({ success: true, ready: player.ready });
            this.socketGroup.addEvent('player:ready', { player: player.id, ready: player.ready });

            if (this.room.isReady()) {
                this.launch();
            }
        } else {
            callback({ success: false, error: 'Player with id "' + data.player + '" not found' });
        }
    }

    /**
     * On kick vote
     *
     * @param {SocketClient} client
     * @param {Object} data
     * @param {Function} callback
     */
    onKickVote(client, data, callback) {
        if (client.isPlaying()) {
            const player = this.room.players.getById(data.player);

            if (player) {
                if (this.isRoomMaster(client)) {
                    this.onKick(player);
                    return callback({ success: true, kicked: true });
                } else {
                    const kickVote = this.kickManager.vote(client, player);
                    return callback({ success: true, kicked: kickVote.hasVote(client) });
                }
            }
        }

        return callback({ success: false, kicked: false });
    }

    /**
     * On config open
     *
     * @param {SocketClient} client
     * @param {Object} data
     * @param {Function} callback
     */
    onConfigOpen(client, data, callback) {
        const success = this.isRoomMaster(client) && this.room.config.setOpen(data.open);

        callback({
            success: success,
            open: this.room.config.open,
            password: this.room.config.password
        });

        if (success) {
            this.socketGroup.addEvent('room:config:open', {
                open: this.room.config.open,
                password: this.room.config.password
            });
        }
    }

    /**
     * On config max score
     *
     * @param {SocketClient} client
     * @param {Object} data
     * @param {Function} callback
     */
    onConfigMaxScore(client, data, callback) {
        const success = this.isRoomMaster(client) && this.room.config.setMaxScore(data.maxScore);

        callback({ success: success, maxScore: this.room.config.maxScore });

        if (success) {
            this.socketGroup.addEvent('room:config:max-score', { maxScore: this.room.config.maxScore });
        }
    }

    /**
     * On config speed
     *
     * @param {SocketClient} client
     * @param {Object} data
     * @param {Function} callback
     */
    onConfigVariable(client, data, callback) {
        const success = this.isRoomMaster(client) && this.room.config.setVariable(data.variable, data.value);

        callback({ success: success, value: this.room.config.getVariable(data.variable) });

        if (success) {
            this.socketGroup.addEvent('room:config:variable', {
                variable: data.variable,
                value: this.room.config.getVariable(data.variable)
            });
        }
    }

    /**
     * On config bonus
     *
     * @param {SocketClient} client
     * @param {Object} data
     * @param {Function} callback
     */
    onConfigBonus(client, data, callback) {
        const success = this.isRoomMaster(client) && this.room.config.toggleBonus(data.bonus);

        callback({ success: success, enabled: this.room.config.getBonus(data.bonus) });

        if (success) {
            this.socketGroup.addEvent('room:config:bonus', {
                bonus: data.bonus,
                enabled: this.room.config.getBonus(data.bonus)
            });
        }
    }

    /**
     * On launch
     *
     * @param {SocketClient} client
     */
    onLaunch(client) {
        if (this.isRoomMaster(client)) {
            if (this.launching) {
                this.cancelLaunch();
            } else {
                this.startLaunch();
            }
        }
    }

    /**
     * On player join
     *
     * @param {Object} data
     */
    onPlayerJoin(data) {
        this.socketGroup.addEvent('room:join', { player: data.player.serialize() });
    }

    /**
     * On player leave
     *
     * @param {Object} data
     */
    onPlayerLeave(data) {
        this.socketGroup.addEvent('room:leave', { player: data.player.id });

        if (this.room.isReady()) {
            this.room.newGame();
        }
    }

    /**
     * Warmup room
     *
     * @param {Room} room
     */
    onGame() {
        this.socketGroup.addEvent('room:game:start');
    }

    /**
     * On kick
     *
     * @param {Player} player
     */
    onKick(player) {
        this.socketGroup.addEvent('room:kick', player.id);
        this.removePlayer(player);
    }

    /**
     * On new vote
     *
     * @param {kickVote} kickVote
     */
    onVoteNew(kickVote) {
        this.socketGroup.addEvent('vote:new', kickVote.serialize());
    }

    /**
     * On vote close
     *
     * @param {kickVote} kickVote
     */
    onVoteClose(kickVote) {
        this.socketGroup.addEvent('vote:close', kickVote.serialize());
    }
}

export default RoomController;
