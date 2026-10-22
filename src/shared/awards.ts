import type { Award, PlayerStats } from './model/GameStats.ts';

/**
 * Awards: the player with the highest value of the field gets it, if it is not a tie and not zero
 */
export const awardFields: Record<string, keyof PlayerStats> = {
    bonusHunter: 'bonuses',
    wallLover: 'wallDeaths',
    clumsy: 'selfDeaths',
    closeCall: 'nearMisses',
    needle: 'squeezes',
    gapRunner: 'gapRuns',
    hunter: 'kills',
    marathon: 'distance',
    survivor: 'longestLife',
    streak: 'longestStreak'
};

/**
 * Awards that need more than one: a streak of one round is no streak
 */
const awardMinimum: Record<string, number> = { streak: 2 };

/**
 * The awards of a game from the counters of its players: the server gives them when a round ends, and they are worked out
 * again for a game that was kept.
 */
export function computeAwards(players: PlayerStats[]): Award[] {
    const awards: Award[] = [];

    for (const [id, field] of Object.entries(awardFields)) {
        const sorted = players.toSorted((a, b) => (b[field] as number) - (a[field] as number));
        const best = sorted[0];

        if (
            best &&
            (best[field] as number) >= (awardMinimum[id] ?? 1) &&
            (sorted.length < 2 || sorted[1][field] !== best[field])
        ) {
            awards.push({ id, player: best.id, value: Math.round(best[field] as number) });
        }
    }

    return awards;
}
