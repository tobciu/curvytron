import type { PlayerCounters } from '../../shared/model/GameResult.ts';

/**
 * The totals of a player over all the games, for the leaderboard. They are added up game by game when a game is kept,
 * and they can be built again from the games (`rebuildTotals`): both ways use `addGame`, so they give the same numbers.
 */
export interface Totals {
    games: number;
    wins: number;
    roundsWon: number;
    kills: number;
    deaths: number;
    /** Everything else that adds up: bonuses, close calls, distance, ... */
    sums: Record<string, number>;
    /** What does not add up, the best value counts: the longest life, the longest streak */
    best: Record<string, number>;
    bonusesByType: Record<string, number>;
}

/** The counters of which the best game counts, not the sum */
const bestFields = new Set(['longestLife', 'longestStreak']);

/** The counters that have a column of their own, and the ones that are not numbers */
const skippedFields = new Set(['kills', 'bonusesByType']);

export function emptyTotals(): Totals {
    return { games: 0, wins: 0, roundsWon: 0, kills: 0, deaths: 0, sums: {}, best: {}, bonusesByType: {} };
}

/**
 * Add one game of a player. A statistic that the game did not have (it did not exist yet) adds nothing.
 */
export function addGame(
    totals: Totals,
    game: { won: boolean; roundsWon: number; counters: Partial<PlayerCounters> }
): Totals {
    const { counters } = game;

    totals.games++;
    totals.wins += game.won ? 1 : 0;
    totals.roundsWon += game.roundsWon;
    totals.kills += counters.kills ?? 0;
    totals.deaths += (counters.wallDeaths ?? 0) + (counters.selfDeaths ?? 0) + (counters.trailDeaths ?? 0);

    for (const [field, value] of Object.entries(counters)) {
        if (typeof value !== 'number' || skippedFields.has(field)) {
            continue;
        }

        if (bestFields.has(field)) {
            totals.best[field] = Math.max(totals.best[field] ?? 0, value);
        } else {
            totals.sums[field] = (totals.sums[field] ?? 0) + value;
        }
    }

    for (const [type, count] of Object.entries(counters.bonusesByType ?? {})) {
        totals.bonusesByType[type] = (totals.bonusesByType[type] ?? 0) + count;
    }

    return totals;
}

/** What the table keeps in `totals_json` */
export function totalsJson(totals: Totals): string {
    return JSON.stringify({ sums: totals.sums, best: totals.best, bonusesByType: totals.bonusesByType });
}

/** The totals of a row of the table */
export function totalsFromRow(row: {
    games: number;
    wins: number;
    rounds_won: number;
    kills: number;
    deaths: number;
    totals_json: string;
}): Totals {
    const json = JSON.parse(row.totals_json) as Partial<Pick<Totals, 'sums' | 'best' | 'bonusesByType'>>;

    return {
        games: row.games,
        wins: row.wins,
        roundsWon: row.rounds_won,
        kills: row.kills,
        deaths: row.deaths,
        sums: json.sums ?? {},
        best: json.best ?? {},
        bonusesByType: json.bonusesByType ?? {}
    };
}
