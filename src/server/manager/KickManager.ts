import { EventEmitter } from 'eventemitter3';
import { Collection } from '@shared/Collection.ts';
import { KickVote } from '../model/KickVote.ts';
import type { RoomController } from '../controller/RoomController.ts';

/** Tracks kick votes for a room; a vote passes at > half the playing clients. */
export class KickManager extends EventEmitter {
  controller: RoomController;
  room: any;
  votes = new Collection<KickVote>();

  constructor(controller: RoomController) {
    super();
    this.controller = controller;
    this.room = controller.room;

    this.updateVotes = this.updateVotes.bind(this);
    this.onClientLeave = this.onClientLeave.bind(this);
    this.onPlayerLeave = this.onPlayerLeave.bind(this);
    this.onVoteClose = this.onVoteClose.bind(this);
    this.clear = this.clear.bind(this);

    this.controller.on('client:add', this.updateVotes);
    this.controller.on('client:remove', this.onClientLeave);
    this.controller.on('player:add', this.updateVotes);
    this.controller.on('player:remove', this.onPlayerLeave);
    this.room.on('game:new', this.clear);
  }

  vote(client: any, player: any): KickVote {
    return this.getVote(player).toggleVote(client);
  }

  getVote(player: any): KickVote {
    if (this.votes.indexExists(player.id)) {
      return this.votes.getById(player.id)!;
    }
    const kickVote = new KickVote(player, this.getTotalClients());
    this.votes.add(kickVote);
    kickVote.on('close', this.onVoteClose);
    this.emit('vote:new', kickVote);
    return kickVote;
  }

  onVoteClose(kickVote: KickVote): void {
    kickVote.removeListener('close', this.onVoteClose);
    this.votes.remove(kickVote);
    if (kickVote.result) {
      this.emit('kick', kickVote.target);
    }
    this.emit('vote:close', kickVote);
  }

  onPlayerLeave(data: any): void {
    const kickVote = this.votes.getById(data.player.id);
    if (kickVote) {
      kickVote.close();
    }
  }

  onClientLeave(data: any): void {
    this.removeClient(data.client);
  }

  removeClient(client: any): void {
    const total = this.getTotalClients();
    for (let i = this.votes.items.length - 1; i >= 0; i--) {
      const kickVote = this.votes.items[i];
      if (kickVote) {
        kickVote.removeClient(client);
        kickVote.setTotal(total);
      }
    }
  }

  getTotalClients(): number {
    return this.controller.clients.filter(function (this: any) {
      return this.isPlaying();
    }).count();
  }

  updateVotes(): void {
    const total = this.getTotalClients();
    for (let i = this.votes.items.length - 1; i >= 0; i--) {
      this.votes.items[i]!.setTotal(total);
    }
  }

  clear(): void {
    for (let i = this.votes.items.length - 1; i >= 0; i--) {
      this.votes.items[i]!.removeListener('close', this.onVoteClose);
    }
    this.votes.clear();
  }
}
