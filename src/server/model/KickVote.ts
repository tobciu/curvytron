import type { VoteData } from '../../shared/protocol.ts';
import { EventEmitter } from '#event-emitter';
import { Collection } from '../../shared/Collection.ts';
import type { SocketClient } from '../core/SocketClient.ts';

/**
 * Kick vote
 */
export class KickVote extends EventEmitter {
    id: any;
    target: any;
    votes: Collection;
    total: any;
    closed: boolean;
    result: boolean;
    timeout: any;

    /**
     * Time before an empty vote is closed
     */
    timeToClose: number = 10000;

    constructor(player: any, total: any) {
        super();

        this.id = player.id;
        this.target = player;
        this.votes = new Collection();
        this.total = Number.parseInt(total, 10);
        this.closed = false;
        this.result = false;
        this.timeout = null;

        this.close = this.close.bind(this);
    }

    /**
     * Set total
     */
    setTotal(total: number) {
        if (this.closed) {
            return this;
        }

        this.total = total;

        this.check();

        return this;
    }

    /**
     * Toggle vote
     */
    toggleVote(client: any) {
        if (this.closed) {
            return this;
        }

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
     */
    removeClient(client: SocketClient) {
        const result = this.votes.remove(client);

        this.check();

        return result;
    }

    /**
     * Check
     */
    check() {
        if (this.closed) {
            return;
        }

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
     */
    hasVote(client: SocketClient): boolean {
        return this.votes.exists(client);
    }

    /**
     * Serialize
     */
    serialize(): VoteData {
        return {
            target: this.target.id,
            result: this.result
        };
    }
}
