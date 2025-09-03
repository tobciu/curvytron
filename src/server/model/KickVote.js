import EventEmitter from 'tom32i-event-emitter.js';
import Collection from '../../shared/Collection.js';

/**
 * Kick vote
 */
class KickVote extends EventEmitter {
    /**
     * Time before an empty vote is closed
     *
     * @type {Number}
     */
    timeToClose = 10000;

    constructor(player, total) {
        super();

        this.id = player.id;
        this.target = player;
        this.votes = new Collection();
        this.total = parseInt(total, 10);
        this.closed = false;
        this.result = false;
        this.timeout = null;

        this.close = this.close.bind(this);
    }

    /**
     * Set total
     *
     * @param {Number} total
     */
    setTotal(total) {
        if (this.closed) { return this; }

        this.total = total;
        this.check();

        return this;
    }

    /**
     * Toggle vote
     *
     * @param {Client} client
     */
    toggleVote(client) {
        if (this.closed) { return this; }

        if (this.hasVote(client)) {
            this.votes.remove(client);
        } else {
            this.votes.add(client);
        }

        this.check();

        return this;
    }

    /**
     * Remove client
     *
     * @param {SocketClient} client
     */
    removeClient(client) {
        const result = this.votes.remove(client);
        this.check();
        return result;
    }

    /**
     * Check
     */
    check() {
        if (this.closed) { return; }

        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        if (this.votes.count() > this.total / 2) {
            this.result = true;
            this.close();
        } else if (this.votes.isEmpty()) {
            this.timeout = setTimeout(this.close, this.timeToClose);
        }
    }

    /**
     * Close the vote
     */
    close() {
        this.closed = true;
        this.votes.clear();
        this.emit('close', this);
    }

    /**
     * Has vote
     *
     * @param {SocketClient} client
     *
     * @return {Boolean}
     */
    hasVote(client) {
        return this.votes.exists(client);
    }

    /**
     * Serialize
     *
     * @return {Object}
     */
    serialize() {
        return {
            target: this.target.id,
            result: this.result
        };
    }
}

export default KickVote;
