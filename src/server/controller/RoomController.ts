import { EventEmitter } from 'eventemitter3';
import { Collection } from '@shared/Collection.ts';
import { SocketGroup } from '../core/SocketGroup.ts';
import { KickManager } from '../manager/KickManager.ts';
import { Chat } from '../service/Chat.ts';
import { Message } from '../model/Message.ts';
import { Player } from '../model/Player.ts';
import type { Room } from '../model/Room.ts';
import type { SocketClient } from '../core/SocketClient.ts';

/** In-room controller: players, chat, config (master-only), ready/launch, kick votes. */
export class RoomController extends EventEmitter {
  static readonly timeToClose = 10000;

  room: Room;
  clients = new Collection<SocketClient>();
  socketGroup: SocketGroup;
  kickManager: KickManager;
  chat = new Chat();
  roomMaster: SocketClient | null = null;
  launching: ReturnType<typeof setTimeout> | null = null;

  callbacks: Record<string, (this: SocketClient, data: any) => void>;

  constructor(room: Room) {
    super();

    const controller = this;
    this.room = room;
    this.socketGroup = new SocketGroup(this.clients);
    this.kickManager = new KickManager(this);

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
      onTalk(data: any) {
        controller.onTalk(this, data[0], data[1]);
      },
      onPlayerAdd(data: any) {
        controller.onPlayerAdd(this, data[0], data[1]);
      },
      onPlayerRemove(data: any) {
        controller.onPlayerRemove(this, data[0], data[1]);
      },
      onReady(data: any) {
        controller.onReady(this, data[0], data[1]);
      },
      onKickVote(data: any) {
        controller.onKickVote(this, data[0], data[1]);
      },
      onName(data: any) {
        controller.onName(this, data[0], data[1]);
      },
      onColor(data: any) {
        controller.onColor(this, data[0], data[1]);
      },
      onLeave() {
        controller.onLeave(this);
      },
      onActivity() {
        controller.onActivity(this);
      },
      onConfigOpen(data: any) {
        controller.onConfigOpen(this, data[0], data[1]);
      },
      onConfigMaxScore(data: any) {
        controller.onConfigMaxScore(this, data[0], data[1]);
      },
      onConfigVariable(data: any) {
        controller.onConfigVariable(this, data[0], data[1]);
      },
      onConfigBonus(data: any) {
        controller.onConfigBonus(this, data[0], data[1]);
      },
      onLaunch() {
        controller.onLaunch(this);
      },
    };

    this.loadRoom();
    this.promptCheckForClose();
  }

  loadRoom(): void {
    this.room.on('close', this.unloadRoom);
    this.room.on('player:join', this.onPlayerJoin);
    this.room.on('player:leave', this.onPlayerLeave);
    this.room.on('game:new', this.onGame);
    this.kickManager.on('kick', this.onKick);
    this.kickManager.on('vote:new', this.onVoteNew);
    this.kickManager.on('vote:close', this.onVoteClose);
  }

  unloadRoom(): void {
    this.room.removeListener('close', this.unloadRoom);
    this.room.removeListener('player:join', this.onPlayerJoin);
    this.room.removeListener('player:leave', this.onPlayerLeave);
    this.room.removeListener('game:new', this.onGame);
    this.kickManager.removeListener('kick', this.onKick);
    this.kickManager.removeListener('vote:new', this.onVoteNew);
    this.kickManager.removeListener('vote:close', this.onVoteClose);
    this.kickManager.clear();
  }

  attach(client: SocketClient, callback: (r: any) => void): void {
    if (this.clients.add(client)) {
      this.attachEvents(client);
      this.onClientAdd(client);
      callback({
        success: true,
        room: this.room.serialize(),
        master: this.roomMaster ? this.roomMaster.id : null,
        clients: this.clients.map(function (this: SocketClient) {
          return this.serialize();
        }).items,
        messages: this.chat.serialize(100),
        votes: this.kickManager.votes.map(function (this: any) {
          return this.serialize();
        }).items,
      });
      this.socketGroup.addEvent('client:add', client.id);
      this.emit('client:add', { room: this.room, client });
    } else {
      callback({ success: false, error: `Client ${client.id} already in the room.` });
    }
    this.checkIntegrity();
  }

  detach(client: SocketClient): void {
    if (this.clients.remove(client)) {
      if (this.room.game) {
        (this.room.game as any).controller.detach(client);
      }
      client.clearPlayers();
      this.detachEvents(client);
      this.promptCheckForClose();
      this.socketGroup.addEvent('client:remove', client.id);
      this.emit('client:remove', { room: this.room, client });
    }
    this.checkIntegrity();
  }

  attachEvents(client: SocketClient): void {
    client.on('close', this.callbacks.onLeave!);
    client.on('activity', this.callbacks.onActivity!);
    client.on('room:leave', this.callbacks.onLeave!);
    client.on('room:talk', this.callbacks.onTalk!);
    client.on('player:add', this.callbacks.onPlayerAdd!);
    client.on('player:remove', this.callbacks.onPlayerRemove!);
    client.on('player:kick', this.callbacks.onKickVote!);
    client.on('room:ready', this.callbacks.onReady!);
    client.on('room:color', this.callbacks.onColor!);
    client.on('room:name', this.callbacks.onName!);
    client.on('players:clear', this.onPlayersClear);
  }

  detachEvents(client: SocketClient): void {
    client.removeListener('close', this.callbacks.onLeave!);
    client.removeListener('activity', this.callbacks.onActivity!);
    client.removeListener('room:leave', this.callbacks.onLeave!);
    client.removeListener('room:talk', this.callbacks.onTalk!);
    client.removeListener('player:add', this.callbacks.onPlayerAdd!);
    client.removeListener('player:remove', this.callbacks.onPlayerRemove!);
    client.removeListener('player:kick', this.callbacks.onKickVote!);
    client.removeListener('room:ready', this.callbacks.onReady!);
    client.removeListener('room:color', this.callbacks.onColor!);
    client.removeListener('room:name', this.callbacks.onName!);
    client.removeListener('players:clear', this.onPlayersClear);
  }

  removePlayer(player: any): void {
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

  nominateRoomMaster(): void {
    if (this.clients.isEmpty() || this.roomMaster) {
      return;
    }
    const roomMaster = this.clients.match(function (this: SocketClient) {
      return (this as any).active && this.isPlaying();
    });
    this.setRoomMaster(roomMaster);
  }

  setRoomMaster(client: SocketClient | null): void {
    if (!this.roomMaster && client) {
      this.roomMaster = client;
      this.roomMaster.on('close', this.removeRoomMaster);
      this.roomMaster.on('room:leave', this.removeRoomMaster);
      this.roomMaster.on('room:config:open', this.callbacks.onConfigOpen!);
      this.roomMaster.on('room:config:max-score', this.callbacks.onConfigMaxScore!);
      this.roomMaster.on('room:config:variable', this.callbacks.onConfigVariable!);
      this.roomMaster.on('room:config:bonus', this.callbacks.onConfigBonus!);
      this.roomMaster.on('room:launch', this.callbacks.onLaunch!);
      this.socketGroup.addEvent('room:master', { client: client.id });
    }
  }

  removeRoomMaster(): void {
    if (this.roomMaster) {
      this.roomMaster.removeListener('close', this.removeRoomMaster);
      this.roomMaster.removeListener('room:leave', this.removeRoomMaster);
      this.roomMaster.removeListener('room:config:open', this.callbacks.onConfigOpen!);
      this.roomMaster.removeListener('room:config:max-score', this.callbacks.onConfigMaxScore!);
      this.roomMaster.removeListener('room:config:variable', this.callbacks.onConfigVariable!);
      this.roomMaster.removeListener('room:config:bonus', this.callbacks.onConfigBonus!);
      this.roomMaster.removeListener('room:launch', this.callbacks.onLaunch!);
      this.roomMaster = null;
      this.nominateRoomMaster();
    }
  }

  isRoomMaster(client: SocketClient): boolean {
    return this.roomMaster !== null && this.roomMaster.id === client.id;
  }

  onClientAdd(client: SocketClient): void {
    client.clearPlayers();
    if (this.room.game) {
      (this.room.game as any).controller.attach(client);
      client.addEvent('room:game:start');
    }
    this.socketGroup.addEvent('client:add', { client: client.serialize() });
    this.nominateRoomMaster();
  }

  promptCheckForClose(): void {
    if (this.clients.isEmpty()) {
      setTimeout(this.checkForClose, RoomController.timeToClose);
    }
  }

  checkForClose(): void {
    if (this.clients.isEmpty()) {
      this.room.close();
    }
  }

  checkIntegrity(): void {
    for (let i = this.room.players.items.length - 1; i >= 0; i--) {
      const player = this.room.players.items[i] as any;
      if (!player.client || !this.clients.exists(player.client)) {
        console.error('"Lost" player removed.');
        this.removePlayer(player);
      }
    }
  }

  startLaunch(): void {
    if (!this.launching) {
      this.launching = setTimeout(this.launch, (this.room.constructor as any).launchTime ?? 5000);
      this.socketGroup.addEvent('room:launch:start');
    }
  }

  cancelLaunch(): void {
    if (this.launching) {
      clearTimeout(this.launching);
      this.launching = null;
      this.socketGroup.addEvent('room:launch:cancel');
    }
  }

  launch(): void {
    if (this.launching) {
      clearTimeout(this.launching);
      this.launching = null;
    }
    this.room.newGame();
  }

  onLeave(client: SocketClient): void {
    this.detach(client);
  }

  onPlayersClear(client: SocketClient): void {
    for (let i = client.players.items.length - 1; i >= 0; i--) {
      this.removePlayer(client.players.items[i]);
    }
  }

  onActivity(client: SocketClient): void {
    this.socketGroup.addEvent('client:activity', { client: client.id, active: (client as any).active });
  }

  onPlayerAdd(client: SocketClient, data: any, callback: (r: any) => void): void {
    const name = String(data.name).substr(0, Player.maxLength).trim();
    const color = typeof data.color !== 'undefined' ? data.color : null;

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

    const player = new Player(client as never, name, color);

    if (this.room.addPlayer(player)) {
      client.players.add(player);
      this.emit('player:add', { room: this.room, player });
      callback({ success: true });
      this.nominateRoomMaster();
    } else {
      return callback({ success: false, error: 'Could not add player.' });
    }
  }

  onPlayerRemove(client: SocketClient, data: any, callback: (r: any) => void): void {
    const player = client.players.getById(data.player);
    if (player) {
      this.removePlayer(player);
      this.emit('player:remove', { room: this.room, player });
    }
    callback({ success: player ? true : false });
  }

  onTalk(client: SocketClient, content: string, callback: (r: any) => void): void {
    const message = new Message(client as any, String(content).substr(0, Message.maxLength));
    const success = this.chat.addMessage(message);
    callback({ success });
    if (success) {
      this.socketGroup.addEvent('room:talk', message.serialize());
    }
  }

  onColor(client: SocketClient, data: any, callback: (r: any) => void): void {
    const player = client.players.getById(data.player);
    if (!player) {
      return callback({ success: false });
    }
    if (player.setColor(data.color)) {
      callback({ success: true, color: player.color });
      this.socketGroup.addEvent('player:color', { player: player.id, color: player.color });
    } else {
      callback({ success: false, color: player.color });
    }
  }

  onName(client: SocketClient, data: any, callback: (r: any) => void): void {
    const player = client.players.getById(data.player);
    const name = String(data.name).substr(0, Player.maxLength).trim();
    if (!player) {
      return callback({ success: false, error: `Unknown player: "${name}"` });
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

  onReady(client: SocketClient, data: any, callback: (r: any) => void): void {
    const player = client.players.getById(data.player);
    if (player) {
      player.toggleReady();
      callback({ success: true, ready: player.ready });
      this.socketGroup.addEvent('player:ready', { player: player.id, ready: player.ready });
      if (this.room.isReady()) {
        this.launch();
      }
    } else {
      callback({ success: false, error: `Player with id "${data.player}" not found` });
    }
  }

  onKickVote(client: SocketClient, data: any, callback: (r: any) => void): void {
    if (client.isPlaying()) {
      const player = this.room.players.getById(data.player);
      if (player) {
        if (this.isRoomMaster(client)) {
          this.onKick(player);
          return callback({ success: true, kicked: true });
        }
        const kickVote = this.kickManager.vote(client, player);
        return callback({ success: true, kicked: kickVote.hasVote(client) });
      }
    }
    return callback({ success: false, kicked: false });
  }

  onConfigOpen(client: SocketClient, data: any, callback: (r: any) => void): void {
    const success = this.isRoomMaster(client) && (this.room.config as any).setOpen(data.open);
    callback({ success, open: this.room.config.open, password: this.room.config.password });
    if (success) {
      this.socketGroup.addEvent('room:config:open', {
        open: this.room.config.open,
        password: this.room.config.password,
      });
    }
  }

  onConfigMaxScore(client: SocketClient, data: any, callback: (r: any) => void): void {
    const success = this.isRoomMaster(client) && this.room.config.setMaxScore(data.maxScore);
    callback({ success, maxScore: this.room.config.maxScore });
    if (success) {
      this.socketGroup.addEvent('room:config:max-score', { maxScore: this.room.config.maxScore });
    }
  }

  onConfigVariable(client: SocketClient, data: any, callback: (r: any) => void): void {
    const success =
      this.isRoomMaster(client) && this.room.config.setVariable(data.variable, data.value);
    callback({ success, value: this.room.config.getVariable(data.variable) });
    if (success) {
      this.socketGroup.addEvent('room:config:variable', {
        variable: data.variable,
        value: this.room.config.getVariable(data.variable),
      });
    }
  }

  onConfigBonus(client: SocketClient, data: any, callback: (r: any) => void): void {
    const success = this.isRoomMaster(client) && this.room.config.toggleBonus(data.bonus);
    callback({ success, enabled: this.room.config.getBonus(data.bonus) });
    if (success) {
      this.socketGroup.addEvent('room:config:bonus', {
        bonus: data.bonus,
        enabled: this.room.config.getBonus(data.bonus),
      });
    }
  }

  onLaunch(client: SocketClient): void {
    if (this.isRoomMaster(client)) {
      if (this.launching) {
        this.cancelLaunch();
      } else {
        this.startLaunch();
      }
    }
  }

  onPlayerJoin(data: any): void {
    this.socketGroup.addEvent('room:join', { player: data.player.serialize() });
  }

  onPlayerLeave(data: any): void {
    this.socketGroup.addEvent('room:leave', { player: data.player.id });
    if (this.room.isReady()) {
      this.room.newGame();
    }
  }

  onGame(): void {
    this.socketGroup.addEvent('room:game:start');
  }

  onKick(player: any): void {
    this.socketGroup.addEvent('room:kick', player.id);
    this.removePlayer(player);
  }

  onVoteNew(kickVote: any): void {
    this.socketGroup.addEvent('vote:new', kickVote.serialize());
  }

  onVoteClose(kickVote: any): void {
    this.socketGroup.addEvent('vote:close', kickVote.serialize());
  }
}
