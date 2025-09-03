import EventEmitter from 'tom32i-event-emitter.js';
import Collection from '../../shared/Collection.js';
import KickVote from '../model/KickVote.js';

/**
 * Kick vote manager
 */
class KickManager extends EventEmitter {
    constructor(controller) {
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
     *
     * @param {SocketClient} client
     * @param {Player} player
     */
    vote(client, player) {
        return this.getVote(player).toggleVote(client);
    }

    /**
     * Get vote for the given player
     *
     * @param {Player} player
     */
    getVote(player) {
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
     *
     * @param {KickVote} kickVote
     */
    onVoteClose(kickVote) {
        kickVote.removeListener('close', this.onVoteClose);
        this.votes.remove(kickVote);

        if (kickVote.result) {
            this.emit('kick', kickVote.target);
        }

        this.emit('vote:close', kickVote);
    }

    /**
     * On player leave
     *
     * @param {Object} data
     */
    onPlayerLeave(data) {
        const player = data.player;
        const kickVote = this.votes.getById(player.id);

        if (kickVote) {
            kickVote.close();
        }
    }

    /**
     * On player leave
     *
     * @param {Object} data
     */
    onClientLeave(data) {
        this.removeClient(data.client);
    }

    /**
     * Remove client
     *
     * @param {SocketClient} client
     */
    removeClient(client) {
        const total = this.getTotalClients();

        for (let i = this.votes.items.length - 1; i >= 0; i--) {
            const kickVote = this.votes.items[i];
            if (kickVote) {
                kickVote.removeClient(client);
                kickVote.setTotal(total);
            }
        }
    }

    /**
     * Get total clients
     *
     * @return {Number}
     */
    getTotalClients() {
        return this.controller.clients.filter(function () { return this.isPlaying(); }).count();
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

export default KickManager;
