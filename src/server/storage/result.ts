import { statsVersion } from '../../shared/model/GameStats.ts';
import type { GameResult, PlayerCounters } from '../../shared/model/GameResult.ts';
import type { Avatar } from '../model/Avatar.ts';
import type { Game } from '../model/Game.ts';

/** The game mode, until there is more than one */
const mode = 'classic';

/** A game needs this many players to count, so that nobody collects points alone */
export const minPlayers = 2;

/**
 * Who counts: the first player of every browser. The other players of a browser (several players on one device) take
 * part in the game, but they are not kept, so they can not be used to collect points against yourself.
 */
function countedAvatars(game: Game): Map<number, Avatar> {
    const first = new Map<unknown, Avatar>();

    for (const avatar of game.avatars.items) {
        const current = first.get(avatar.player.client);

        if (!current || (avatar.player.id ?? Infinity) < (current.player.id ?? Infinity)) {
            first.set(avatar.player.client, avatar);
        }
    }

    return new Map([...first.values()].map((avatar) => [avatar.id, avatar]));
}

/**
 * The result of a game, from its statistics and its room. Plain data: nothing here knows the database.
 * Call it while the game still has its avatars (the `end` event comes before they are released).
 *
 * Only the players that count are in it (see `countedAvatars`): the ranks are among them, a round won by somebody else
 * has no winner here. The caller keeps the result only when it has `minPlayers` players.
 */
export function buildGameResult(game: Game, endedAt: number = Date.now()): GameResult {
    const all = game.stats.serialize();
    const counted = countedAvatars(game);
    const stats = { ...all, players: all.players.filter((player) => counted.has(player.id)) };
    // An identity counts once in a game (the same code in two browsers is one player)
    const identities = new Set<string>();
    const slots = new Map(stats.players.map((player, index) => [player.id, index]));
    const slotOf = (id: number | null): number | null => (id === null ? null : (slots.get(id) ?? null));
    const config = game.room.config.serialize();

    return {
        startedAt: game.stats.startedAt ?? endedAt,
        endedAt,
        room: game.room.name,
        mode,
        tag: game.room.tag,
        rounds: all.rounds.length,
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
            const { id, name, color, score, roundsWon, ...counters } = player;
            const identity = counted.get(id)?.player.client.identityHash ?? null;
            const once = identity !== null && !identities.has(identity);

            if (once) {
                identities.add(identity);
            }

            return {
                slot: index,
                name,
                color,
                // Players with the same score share the rank, the next rank is skipped as usual
                rank: 1 + stats.players.filter((other) => other.score > score).length,
                score,
                roundsWon,
                counters: counters as PlayerCounters,
                identity: once ? identity : null
            };
        }),
        roundResults: all.rounds.map((round) => ({
            round: round.round,
            winner: slotOf(round.winner),
            duration: round.duration
        })),
        feats: all.feats.flatMap((feat) => {
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
