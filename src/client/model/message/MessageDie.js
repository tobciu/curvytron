/**
 * Die message
 *
 * @param {Player} deadPlayer
 * @param {Player} killerPlayer
 * @param {Boolean} old
 */
export class MessageDie {
    constructor(deadPlayer, killerPlayer, old) {
        this.deadPlayer = deadPlayer;
        this.killerPlayer = killerPlayer;
        this.old = old;
        this.type = this.resolveType();
    }

    /**
     * Resolve type
     *
     * @return {String}
     */
    resolveType() {
        if (!this.killerPlayer) {
            return 'wall';
        }

        if (this.deadPlayer.equal(this.killerPlayer)) {
            return 'suicide';
        }

        return this.old ? 'crash' : 'kill';
    }
}
