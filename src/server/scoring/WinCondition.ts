import { Collection } from '../../shared/Collection.ts';
import { finaleRounds } from '../../shared/scoring.ts';
import type { WinConditionId } from '../../shared/scoring.ts';
import type { Avatar } from '../model/Avatar.ts';
import type { Game } from '../model/Game.ts';

/** Where a round is on the way to the end of the game */
export interface RoundPlan {
    /** The game is over after this round */
    last: boolean;
    /** Every source of points counts twice */
    finale: boolean;
}

/**
 * When a game is over. The condition tells who can win the game (nobody as long as it is not over) and, when a round
 * starts, whether it is one of the last. The scoring of the points is not its business (see `ScoringMode`).
 */
export interface WinCondition {
    id: WinConditionId;
    /** The avatars that can win the game, empty as long as it is not over */
    candidates(game: Game): Collection<Avatar>;
    /** Called when a round starts */
    plan(game: Game): RoundPlan;
}

/** A round takes this long (ms) when there is no round to learn it from */
export const defaultRoundTime = 60000;

/** The game is over when somebody reached the score, it is not played for a round that is the last one */
const points: WinCondition = {
    id: 'points',

    candidates(game) {
        const maxScore = game.maxScore;

        return game.avatars.filter(function () {
            return this.present && this.score >= maxScore;
        });
    },

    plan() {
        return { last: false, finale: false };
    }
};

/** Candidates once the last round was played: everybody who takes part */
function afterLastRound(game: Game): Collection<Avatar> {
    return (game.finalPlayed ? game.getPresentAvatars() : new Collection<Avatar>([], 'id')) as Collection<Avatar>;
}

/** The game is over after a number of rounds */
const rounds: WinCondition = {
    id: 'rounds',

    candidates: afterLastRound,

    plan(game) {
        const left = game.rounds - game.roundsPlayed;

        return { last: left <= 1, finale: left <= finaleRounds };
    }
};

/**
 * The game is over after some time. A round is not cut off: the last round is the first one that starts with less time
 * left than a round takes (on average, with the pauses), so that the players know before it starts.
 */
const time: WinCondition = {
    id: 'time',

    candidates: afterLastRound,

    plan(game) {
        const left = game.minutes * 60000 - (Date.now() - (game.startedAt ?? Date.now()));
        const round = game.averageRoundTime();

        return { last: left <= round, finale: left <= finaleRounds * round };
    }
};

export const winConditions: Record<WinConditionId, WinCondition> = { points, rounds, time };
