/**
 * What the HTTP interface of the statistics (`/api/...`) answers: the games that were kept, the leaderboard, the records.
 * Names of players who keep out of the public lists are "Anonymous", the feats of the others are only counted, the owner knows them.
 */
import type { GameStatsData } from './GameStats.ts';

/** What a player who is not shown is called */
export const anonymous = 'Anonymous';

/** Feats that are not given anymore (a statistic or an award now): the old ones are not counted in the lists */
export const retiredFeats: readonly string[] = ['graveKill'];

export interface ApiGamePlayer {
    slot: number;
    name: string;
    color: string;
    rank: number;
    score: number;
    roundsWon: number;
    /** The player is the viewer (the identity code was sent) */
    mine?: boolean;
}

export interface ApiGame {
    id: number;
    startedAt: number;
    endedAt: number;
    room: string;
    tag: string | null;
    mode: string;
    rounds: number;
    maxScore: number;
    completed: boolean;
    players: ApiGamePlayer[];
    /** How many special feats happened in the game */
    feats: number;
}

export interface ApiGames {
    games: ApiGame[];
    /** Pass it as `before` to get the games before these, null when there are no more */
    next: number | null;
}

/** A game with its statistics as the game showed them at the end (the player ids are the slots) */
export interface ApiGameDetail extends ApiGame {
    stats: GameStatsData;
    /** The feats of the other players: they are only counted, `stats.feats` has the ones of the viewer */
    hiddenFeats: number;
}

export const leaderboardBys = ['wins', 'winRate', 'roundsWon', 'kills', 'games'] as const;
export type LeaderboardBy = (typeof leaderboardBys)[number];

export interface ApiLeaderboardEntry {
    rank: number;
    name: string;
    games: number;
    wins: number;
    /** Wins per game, 0 to 1 */
    winRate: number;
    roundsWon: number;
    kills: number;
    deaths: number;
    mine?: boolean;
}

export interface ApiLeaderboard {
    by: LeaderboardBy;
    /** Players with fewer games are not ranked by their win rate: one win in one game is no skill */
    minGamesForWinRate: number;
    entries: ApiLeaderboardEntry[];
}

export interface ApiRecord {
    id: string;
    value: number;
    name: string;
    gameId: number;
    endedAt: number;
    room: string;
}

export interface ApiRecords {
    records: ApiRecord[];
}

export interface ApiTag {
    tag: string;
    games: number;
}

export interface ApiTags {
    tags: ApiTag[];
}

/** What a request of the viewer may ask: all optional */
export interface GamesQuery {
    limit: number;
    before: number | null;
    tag: string | null;
}

/** The totals of a player, over all their games */
export interface ApiMyTotals {
    games: number;
    wins: number;
    winRate: number;
    roundsWon: number;
    kills: number;
    deaths: number;
    /** The longest life and the longest streak of all their games, the best bonuses by type */
    bestLife: number;
    bestStreak: number;
    bonuses: number;
}

/** A feat of the viewer, with its real id: they have seen it in the game already */
export interface ApiMyFeat {
    id: string;
    round: number;
    gameId: number;
    endedAt: number;
    room: string;
    /** The name of the other player of the feat (the revenge was on them) */
    other?: string;
}

/** What `/api/me` tells the browser about its own identity */
export type ApiMe =
    { known: false } | { known: true; name: string; public: boolean; totals: ApiMyTotals; feats: ApiMyFeat[] };
