/** Statistics of a game, sent by the server at the end of every round */

/**
 * Version of the definitions of the statistics: raise it when something is counted in another way (it is stored with
 * the games, so that old and new games are not mixed up)
 */
export const statsVersion = 2;

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
    /** Deaths of others on the trail of this player after the player was dead already */
    graveKills: number;
    /** Times the avatar passed very close to the trail of another player without touching it */
    nearMisses: number;
    /** Times the avatar passed between two trails of other players that are close to each other (a gap) */
    squeezes: number;
    /** Gaps in the trails of other players that the avatar went through (every gap once) */
    gapRuns: number;
    /** Most rounds won in a row */
    longestStreak: number;
    distance: number;
    /** Distance driven while leaving a trail */
    trailLength: number;
    /** Longest time alive in a round (ms) */
    longestLife: number;
}

/**
 * What a player did in the current round. Runtime state of the server: it is reset at the start of every round and
 * not stored, so `statsVersion` stays as it is
 */
export interface RoundCounters {
    nearMisses: number;
    squeezes: number;
    bonuses: number;
    /** Deaths of others on this player's trail */
    kills: number;
    distance: number;
    /** Time (ms) close to a border, not counted while the borders are no danger */
    wallTime: number;
    /** Place in the round (1 is the winner), null while the player is alive and in the round */
    place: number | null;
}

/** What a player is the best at: the key of the award, the winner and their value */
export interface Award {
    id: string;
    player: number;
    value: number;
}

/** A special feat: something that happened in a round, shown when it happens */
export interface Feat {
    id: string;
    player: number;
    round: number;
    /** The other player of the feat, when there is one (the one the revenge is on) */
    other?: number;
}

/** How a round ended */
export interface RoundResult {
    round: number;
    /** Id of the winner, null when everybody died together */
    winner: number | null;
    /** Time between the start and the end of the round (ms) */
    duration: number;
    /** Size of the map in this round */
    size: number;
}

export interface GameStatsData {
    players: PlayerStats[];
    awards: Award[];
    rounds: RoundResult[];
    feats: Feat[];
}
