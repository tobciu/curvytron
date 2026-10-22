/**
 * Special feats: texts for what happens in a round. They are hidden: the rules page does not list them, the players see
 * them at the end of the round and of the game when they happen. The server decides what they are, see
 * `src/server/service/Feats.ts`.
 */
export interface FeatInfo {
    label: string;
    /** What the player did. `{other}` is the name of the other player of the feat, if there is one */
    description: string;
}

export const featInfo: Record<string, FeatInfo> = {
    cleanSweep: {
        label: 'Clean sweep',
        description: 'Everybody else crashed on the trail of this player in one round.'
    },
    doubleKill: {
        label: 'Double kill',
        description: 'Two players crashed on the trail of this player within a second.'
    },
    graveKill: {
        label: 'From beyond the grave',
        description: 'Somebody crashed on the trail of this player after they were out of the round already.'
    },
    revenge: {
        label: 'Revenge',
        description: 'Got {other} on their trail, who got them in the round before.'
    },
    photoFinish: {
        label: 'Photo finish',
        description: 'Died at the very same moment as the others, nobody won the round.'
    },
    pacifist: {
        label: 'Pacifist',
        description: 'Won the round without a single kill: the others took care of themselves.'
    },
    badKarma: {
        label: 'Bad karma',
        description:
            'Died right after catching a bonus that is a risk for the player themselves: faster (the rocket) or angular (turns of 45°).'
    },
    timesUp: {
        label: "Time's up",
        description: 'Died right after the invincibility (Master bonus) ran out.'
    },
    bonusRush: {
        label: 'Bonus rush',
        description: 'Caught three bonuses within five seconds.'
    },
    daredevil: {
        label: 'Daredevil',
        description: 'Three close calls within three seconds.'
    },
    rookieMistake: {
        label: 'Rookie mistake',
        description: 'Crashed on a border or on their own trail in the first five seconds of the round.'
    },
    wallRider: {
        label: 'Wall rider',
        description: 'Rode along a border for three seconds without crashing.'
    },
    whitewash: {
        label: 'Whitewash',
        description: 'Won the game without losing a single round.'
    },
    earlyExit: {
        label: 'Early exit',
        description: 'First one out, three rounds in a row.'
    }
};
