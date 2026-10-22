/**
 * The result of a finished game, as the storage keeps it: plain data, built from the statistics of the game.
 * A player is identified by the `slot`, their place in the game (the avatar ids are only meaningful during the game).
 */
import type { PlayerStats } from './GameStats.ts';

/** The counters of a player, without what the storage keeps in its own columns */
export type PlayerCounters = Omit<PlayerStats, 'id' | 'name' | 'color' | 'score' | 'roundsWon'>;

export interface GameResultPlayer {
    slot: number;
    name: string;
    color: string;
    /** 1 for the winner, players with the same score share the rank */
    rank: number;
    score: number;
    roundsWon: number;
    counters: PlayerCounters;
}

export interface GameResultRound {
    round: number;
    /** Slot of the winner, null when everybody died together */
    winner: number | null;
    duration: number;
}

export interface GameResultFeat {
    round: number;
    /** Slot of the player */
    slot: number;
    feat: string;
    /** Slot of the other player of the feat */
    other?: number;
}

export interface GameResult {
    startedAt: number;
    endedAt: number;
    room: string;
    mode: string;
    tag: string | null;
    rounds: number;
    maxScore: number;
    /** Somebody won the game, false when it ended because everybody left or because of an error */
    completed: boolean;
    /** What the room was set to: the bonuses and the variables (never the password) */
    config: { bonuses: string[]; variables: Record<string, number> };
    statsVersion: number;
    players: GameResultPlayer[];
    roundResults: GameResultRound[];
    feats: GameResultFeat[];
}
