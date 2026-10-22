/**
 * What the statistics and the awards at the end of a game mean, in one place.
 *
 * The game results show the `label` and the `description` in a tooltip, the rules page adds `how`: how to get the value
 * up, and how it is counted. Keep it in line with `src/server/service/GameStats.ts`, which does the counting.
 */
import type { PlayerStats } from '../../shared/model/GameStats';

export interface StatInfo {
    label: string;
    /** What is counted */
    description: string;
    /** How to get it, and the details of the counting */
    how: string;
}

/** The columns of the statistics table, in the order of the table */
export const statInfo = {
    roundsWon: {
        label: 'Rounds',
        description: 'Rounds won.',
        how: 'Be the last one alive. If everybody dies together, nobody wins the round.'
    },
    bonuses: {
        label: 'Bonuses',
        description: 'Bonuses caught. Hover a number to see which ones.',
        how: 'Drive over a bonus on the map. Every bonus counts, good or bad, and the details show which types you caught.'
    },
    deaths: {
        label: 'Deaths',
        description: 'Times the player died. Hover a number to see what killed them.',
        how: 'A border, your own trail or the trail of another player. The details show how often each of them got you.'
    },
    kills: {
        label: 'Kills',
        description: 'Players that crashed on the trail of this player.',
        how: 'Cut off another player so they crash into your trail. Crashes on the border or on their own trail are nobody’s kill.'
    },
    nearMisses: {
        label: 'Close calls',
        description: 'Times the player passed very close to the trail of another player, without touching it.',
        how: 'Skim along the trail of somebody else without touching it. Every approach counts once, even if it is long. Your own trail does not count.'
    },
    squeezes: {
        label: 'Squeezes',
        description:
            'Times the player passed between trails of other players that are close to each other, like a gap.',
        how: 'Pass between the trails of other players, for example two lines that run next to each other. Gaps in a single trail do not count, see Gap runs. Every pass counts once.'
    },
    gapRuns: {
        label: 'Gap runs',
        description: 'Gaps in the trails of other players that the player drove through.',
        how: 'A trail has a short gap every few seconds. Cross a gap that another player left, wherever and at whatever angle. Every gap counts once for you, gaps in your own trail never count, and the gap you leave while you are invincible does not exist.'
    },
    distance: {
        label: 'Distance',
        description: 'Distance driven, in the units of the map.',
        how: 'Stay alive and keep moving: the longer you live, the further you go. Every bit counts, also while you are invincible (Master bonus) and without a trail. Faster speed helps, a jump over the border does not count.'
    },
    longestLife: {
        label: 'Longest life',
        description: 'Longest time the player stayed alive in one round: the best round, not the sum of all rounds.',
        how: 'Survive one round for as long as you can. Only your best round counts, so it does not matter how many rounds you play. The winner of a round counts until the end of it.'
    }
} as const satisfies Record<string, StatInfo>;

/** The awards of the end of the game: the field of the statistics they look at, and what they are for */
export const awardInfo: Record<string, StatInfo & { field: keyof PlayerStats }> = {
    bonusHunter: {
        label: 'Bonus hunter',
        field: 'bonuses',
        description: 'Caught the most bonuses.',
        how: 'Go for every bonus on the map, even when it is risky.'
    },
    wallLover: {
        label: 'Wall lover',
        field: 'wallDeaths',
        description: 'Crashed the most often on a border.',
        how: 'Not one to aim for: it goes to the player who died on a border most often.'
    },
    clumsy: {
        label: 'Own worst enemy',
        field: 'selfDeaths',
        description: 'Died the most often on their own trail.',
        how: 'Not one to aim for: it goes to the player who crashed on their own trail most often.'
    },
    closeCall: {
        label: 'Close call',
        field: 'nearMisses',
        description: 'Passed the most often very close to the trail of another player, without touching it.',
        how: 'Drive close to the trails of others, as often as you dare.'
    },
    needle: {
        label: "Needle's eye",
        field: 'squeezes',
        description: 'Squeezed the most often between trails of other players that are close to each other.',
        how: 'Look for narrow gaps between the trails of others and go through them.'
    },
    gapRunner: {
        label: 'Gap runner',
        field: 'gapRuns',
        description: 'Drove through the most gaps in the trails of other players.',
        how: 'Look for the gaps in the trails of others and go through them.'
    },
    hunter: {
        label: 'Hunter',
        field: 'kills',
        description: 'Killed the most players on their trail.',
        how: 'Cut off the others in front of you instead of waiting for mistakes.'
    },
    marathon: {
        label: 'Marathon driver',
        field: 'distance',
        description: 'Drove the longest distance.',
        how: 'Survive many rounds, and make them long.'
    },
    survivor: {
        label: 'Survivor',
        field: 'longestLife',
        description: 'Stayed alive the longest in one round (the best round, not the sum).',
        how: 'Play safe in one round: only the longest single round counts.'
    }
};

/** Rules that apply to all the awards and to the counting */
export const countingRules: readonly string[] = [
    'Statistics are counted for the whole game, over all rounds, and shown with the final ranking.',
    'An award goes to the player with the highest value. Nobody gets it for a value of zero or for a tie.',
    'Close calls, squeezes and gap runs are not counted while you are invincible, it would be too easy and takes no courage. The other statistics (distance, bonuses, kills) count as usual.',
    'Players who join a running game start counting when they join.'
];
