import { statsVersion } from '../../shared/model/GameStats.ts';
import type { GameResult, PlayerCounters } from '../../shared/model/GameResult.ts';
import type { Game } from '../model/Game.ts';

/** The game mode, until there is more than one */
const mode = 'classic';

/**
 * The result of a game, from its statistics and its room. Plain data: nothing here knows the database.
 * Call it while the game still has its avatars (the `end` event comes before they are released).
 */
export function buildGameResult(game: Game, endedAt: number = Date.now()): GameResult {
    const stats = game.stats.serialize();
    const slots = new Map(stats.players.map((player, index) => [player.id, index]));
    const slotOf = (id: number | null): number | null => (id === null ? null : (slots.get(id) ?? null));
    const config = game.room.config.serialize();

    return {
        startedAt: game.stats.startedAt ?? endedAt,
        endedAt,
        room: game.room.name,
        mode,
        tag: game.room.tag,
        rounds: stats.rounds.length,
        maxScore: game.maxScore,
        completed: game.gameWinner !== null,
        config: {
            bonuses: Object.entries(config.bonuses)
                .filter(([, enabled]) => enabled)
                .map(([name]) => name),
            variables: config.variables
        },
        statsVersion,
        players: stats.players.map((player, index) => {
            const { id: _id, name, color, score, roundsWon, ...counters } = player;

            return {
                slot: index,
                name,
                color,
                // Players with the same score share the rank, the next rank is skipped as usual
                rank: 1 + stats.players.filter((other) => other.score > score).length,
                score,
                roundsWon,
                counters: counters as PlayerCounters
            };
        }),
        roundResults: stats.rounds.map((round) => ({
            round: round.round,
            winner: slotOf(round.winner),
            duration: round.duration
        })),
        feats: stats.feats.flatMap((feat) => {
            const slot = slotOf(feat.player);

            return slot === null
                ? []
                : [
                      {
                          round: feat.round,
                          slot,
                          feat: feat.id,
                          ...(feat.other === undefined ? {} : { other: slotOf(feat.other) ?? undefined })
                      }
                  ];
        })
    };
}
