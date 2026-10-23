import type { ScoringMode } from './ScoringMode.ts';

/**
 * The classic scoring: the order of the deaths decides, the winner of the round gets one point for every avatar that
 * died before it.
 */
export const classicMode: ScoringMode = {
    id: 'classic',
    warmdownTime: 5000,

    onKill(game, avatar, place) {
        game.award(avatar, place);
    },

    onBonusCatch() {},

    onRoundEnd(game, winner) {
        if (winner) {
            game.award(winner, Math.max(game.avatars.count() - 1, 1));
        }
    }
};
