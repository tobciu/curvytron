/** Statistics of a game, sent by the server at the end of every round */

/** Counters of one player */
export interface PlayerStats {
    id: number;
    name: string;
    color: string;
    score: number;
    roundsWon: number;
    bonuses: number;
    bonusesByType: Record<string, number>;
    /** Killed by a border */
    wallDeaths: number;
    /** Killed by their own trail */
    selfDeaths: number;
    /** Killed by the trail of another player */
    trailDeaths: number;
    /** Deaths of others on this player's trail */
    kills: number;
    /** Times the avatar passed very close to the trail of another player without touching it */
    nearMisses: number;
    distance: number;
    /** Distance driven while leaving a trail */
    trailLength: number;
    /** Longest time alive in a round (ms) */
    longestLife: number;
}

/** What a player is the best at: the key of the award, the winner and their value */
export interface Award {
    id: string;
    player: number;
    value: number;
}

export interface GameStatsData {
    players: PlayerStats[];
    awards: Award[];
}
