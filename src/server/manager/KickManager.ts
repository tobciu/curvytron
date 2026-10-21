import { EventEmitter } from '#event-emitter';
import { KickVote } from '../model/KickVote.ts';
import { Collection } from '../../shared/Collection.ts';
import type { SocketClient } from '../core/SocketClient.ts';
import type { Player } from '../model/Player.ts';

/**
 * Kick vote manager
 */
export class KickManager extends EventEmitter {
    controller: any;
    room: any;
    votes: Collection;

    constructor(controller: any) {
        super();

        this.controller = controller;
        this.room = this.controller.room;
        this.votes = new Collection();

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

    /**
     * Vote
     */
    vote(client: SocketClient, player: Player) {
        return this.getVote(player).toggleVote(client);
    }

    /**
     * Get vote for the given player
     */
    getVote(player: Player) {
        if (this.votes.indexExists(player.id)) {
            return this.votes.getById(player.id);
        }

        const kickVote = new KickVote(player, this.getTotalClients());

        this.votes.add(kickVote);
        kickVote.on('close', this.onVoteClose);
        this.emit('vote:new', kickVote);

        return kickVote;
    }

    /**
     * On vote close
     */
    onVoteClose(kickVote: KickVote) {
        kickVote.removeListener('close', this.onVoteClose);
        this.votes.remove(kickVote);

        if (kickVote.result) {
            this.emit('kick', kickVote.target);
        }

        this.emit('vote:close', kickVote);
    }

    /**
     * On player leave
     */
    onPlayerLeave(data: any) {
        const player = data.player,
            kickVote = this.votes.getById(player.id);

        if (kickVote) {
            kickVote.close();
        }
    }

    /**
     * On player leave
     */
    onClientLeave(data: any) {
        this.removeClient(data.client);
    }

    /**
     * Remove client
     */
    removeClient(client: SocketClient) {
        const total = this.getTotalClients();
        let kickVote;

        for (let i = this.votes.items.length - 1; i >= 0; i--) {
            kickVote = this.votes.items[i];

            if (kickVote) {
                kickVote.removeClient(client);
                kickVote.setTotal(total);
            }
        }
    }

    /**
     * Get total clients
     */
    getTotalClients(): number {
        return this.controller.clients
            .filter(function (this: SocketClient) {
                return this.isPlaying();
            })
            .count();
    }

    /**
     * Update votes
     */
    updateVotes() {
        const total = this.getTotalClients();

        for (let i = this.votes.items.length - 1; i >= 0; i--) {
            this.votes.items[i].setTotal(total);
        }
    }

    /**
     * Clear
     */
    clear() {
        for (let i = this.votes.items.length - 1; i >= 0; i--) {
            this.votes.items[i].removeListener('close', this.onVoteClose);
        }

        this.votes.clear();
    }
}
