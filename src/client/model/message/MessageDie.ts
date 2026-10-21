/**
 * Die message
 */
export class MessageDie {
    deadPlayer: any;
    killerPlayer: any;
    old: any;
    type: any;

    constructor(deadPlayer: any, killerPlayer: any, old: any) {
        this.deadPlayer = deadPlayer;
        this.killerPlayer = killerPlayer;
        this.old = old;
        this.type = this.resolveType();
    }

    /**
     * Resolve type
     */
    resolveType(): string {
        if (!this.killerPlayer) {
            return 'wall';
        }

        if (this.deadPlayer.equal(this.killerPlayer)) {
            return 'suicide';
        }

        return this.old ? 'crash' : 'kill';
    }
}
