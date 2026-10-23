import type { DatabaseSync } from 'node:sqlite';
import { computeAwards } from '../../shared/awards.ts';
import type { PlayerCounters } from '../../shared/model/GameResult.ts';
import type { Feat, PlayerStats, RoundResult } from '../../shared/model/GameStats.ts';
import {
    anonymous,
    retiredFeats,
    type ApiGame,
    type ApiGameDetail,
    type ApiGamePlayer,
    type ApiGames,
    type ApiLeaderboard,
    type ApiLeaderboardEntry,
    type ApiRecord,
    type ApiRecords,
    type ApiTags,
    type GamesQuery,
    type LeaderboardBy
} from '../../shared/model/StatsApi.ts';
import { addGame, emptyTotals, totalsFromRow, type Totals } from './totals.ts';

/** SQL: the feats that are given today (the retired ones are kept in the games but not counted) */
const currentFeats = `feat NOT IN (${retiredFeats.map((id) => `'${id}'`).join(', ')})`;

/** The records, in the order they are shown (the texts are in `src/client/content/stats.ts`) */
export const recordIds = [
    'highestScore',
    'longestStreak',
    'mostKills',
    'longestLife',
    'mostGapRuns',
    'mostBonuses',
    'longestDistance',
    'mostFeats',
    'longestGame',
    'mostRounds'
] as const;

/** Players with fewer games are not ranked by their win rate */
export const minGamesForWinRate = 5;

interface GameRow {
    id: number;
    started_at: number;
    ended_at: number;
    room: string;
    mode: string;
    tag: string | null;
    rounds: number;
    max_score: number;
    completed: number;
}

interface PlayerRow {
    game_id: number;
    slot: number;
    player_id: number | null;
    public: number | null;
    name: string;
    color: string;
    rank: number;
    score: number;
    rounds_won: number;
    stats_json: string;
}

/** What a game that was kept before a statistic existed has for it */
const emptyCounters: PlayerCounters = {
    bonuses: 0,
    bonusesByType: {},
    wallDeaths: 0,
    selfDeaths: 0,
    trailDeaths: 0,
    kills: 0,
    graveKills: 0,
    nearMisses: 0,
    squeezes: 0,
    gapRuns: 0,
    longestStreak: 0,
    distance: 0,
    trailLength: 0,
    longestLife: 0
};

/** A player who keeps out of the public lists is not named in them */
function shownName(row: { name: string; public: number | null }): string {
    return row.public === 0 ? anonymous : row.name;
}

/**
 * What the statistics ask of the database: reads only, and nothing that is not meant for everybody. `viewer` is the
 * player (the id in `players`) who asks, if the request told its identity: they see their own name and their own feats.
 */
export class StatsQueries {
    db: DatabaseSync;

    constructor(db: DatabaseSync) {
        this.db = db;
    }

    /** The entry of the player of an identity (the hash of its code), if there is one */
    playerIdByIdentity(hash: string): number | null {
        const row = this.db.prepare('SELECT id FROM players WHERE identity_hash = ?').get(hash) as
            { id: number } | undefined;

        return row?.id ?? null;
    }

    private playersOf(gameIds: number[], viewer: number | null): Map<number, ApiGamePlayer[]> {
        const players = new Map<number, ApiGamePlayer[]>();

        if (gameIds.length === 0) {
            return players;
        }

        const rows = this.db
            .prepare(
                `SELECT gp.game_id, gp.slot, gp.player_id, p.public, gp.name, gp.color, gp.rank, gp.score, gp.rounds_won
                 FROM game_players gp LEFT JOIN players p ON p.id = gp.player_id
                 WHERE gp.game_id IN (${gameIds.map(() => '?').join(',')})
                 ORDER BY gp.game_id, gp.rank, gp.slot`
            )
            .all(...gameIds) as unknown as PlayerRow[];

        for (const row of rows) {
            const mine = viewer !== null && row.player_id === viewer;
            const list = players.get(row.game_id) ?? [];

            list.push({
                slot: row.slot,
                name: mine ? row.name : shownName(row),
                color: row.color,
                rank: row.rank,
                score: row.score,
                roundsWon: row.rounds_won,
                ...(mine ? { mine: true } : {})
            });
            players.set(row.game_id, list);
        }

        return players;
    }

    private toGame(row: GameRow, players: ApiGamePlayer[], feats: number): ApiGame {
        return {
            id: row.id,
            startedAt: row.started_at,
            endedAt: row.ended_at,
            room: row.room,
            tag: row.tag,
            mode: row.mode,
            rounds: row.rounds,
            maxScore: row.max_score,
            completed: row.completed === 1,
            players,
            feats
        };
    }

    /** The games that were kept, the latest first */
    listGames(query: GamesQuery, viewer: number | null = null): ApiGames {
        const rows = this.db
            .prepare(
                `SELECT * FROM games WHERE (?1 IS NULL OR id < ?1) AND (?2 IS NULL OR tag = ?2)
                 ORDER BY id DESC LIMIT ?3`
            )
            .all(query.before, query.tag, query.limit + 1) as unknown as GameRow[];
        const page = rows.slice(0, query.limit);
        const ids = page.map((row) => row.id);
        const players = this.playersOf(ids, viewer);
        const feats = new Map<number, number>();

        if (ids.length > 0) {
            const counts = this.db
                .prepare(
                    `SELECT game_id, COUNT(*) AS feats FROM feats
                     WHERE ${currentFeats} AND game_id IN (${ids.map(() => '?').join(',')}) GROUP BY game_id`
                )
                .all(...ids) as Array<{ game_id: number; feats: number }>;

            for (const { game_id: id, feats: count } of counts) {
                feats.set(id, count);
            }
        }

        return {
            games: page.map((row) => this.toGame(row, players.get(row.id) ?? [], feats.get(row.id) ?? 0)),
            next: rows.length > query.limit ? page[page.length - 1].id : null
        };
    }

    /** One game with its statistics as the game showed them at the end, null when there is none */
    getGame(id: number, viewer: number | null = null): ApiGameDetail | null {
        const game = this.db.prepare('SELECT * FROM games WHERE id = ?').get(id) as unknown as GameRow | undefined;

        if (!game) {
            return null;
        }

        const rows = this.db
            .prepare(
                `SELECT gp.*, p.public FROM game_players gp LEFT JOIN players p ON p.id = gp.player_id
                 WHERE gp.game_id = ? ORDER BY gp.slot`
            )
            .all(id) as unknown as PlayerRow[];
        const players: PlayerStats[] = rows.map((row) => ({
            ...emptyCounters,
            ...(JSON.parse(row.stats_json) as Partial<PlayerCounters>),
            id: row.slot,
            name: viewer !== null && row.player_id === viewer ? row.name : shownName(row),
            color: row.color,
            score: row.score,
            roundsWon: row.rounds_won
        }));
        const mine = new Set(rows.filter((row) => viewer !== null && row.player_id === viewer).map((row) => row.slot));
        const rounds = (
            this.db
                .prepare('SELECT round, winner_slot, duration_ms, size FROM rounds WHERE game_id = ? ORDER BY round')
                .all(id) as Array<{ round: number; winner_slot: number | null; duration_ms: number; size: number }>
        ).map((round): RoundResult => ({
            round: round.round,
            winner: round.winner_slot,
            duration: round.duration_ms,
            size: round.size
        }));
        const feats: Feat[] = [];
        let hiddenFeats = 0;
        const featRows = this.db
            .prepare(
                `SELECT round, slot, feat, other_slot FROM feats WHERE game_id = ? AND ${currentFeats} ORDER BY round, rowid`
            )
            .all(id) as Array<{ round: number; slot: number; feat: string; other_slot: number | null }>;

        for (const feat of featRows) {
            if (mine.has(feat.slot)) {
                // The owner of a feat knows it already, nobody else is told what it was: the others only get the number
                feats.push({
                    id: feat.feat,
                    player: feat.slot,
                    round: feat.round,
                    ...(feat.other_slot === null ? {} : { other: feat.other_slot })
                });
            } else {
                hiddenFeats++;
            }
        }

        return {
            ...this.toGame(game, this.playersOf([id], viewer).get(id) ?? [], featRows.length),
            stats: { players, awards: computeAwards(players), rounds, feats },
            hiddenFeats
        };
    }

    /** The players ranked, for all games or for the games of a tag. Players out of the public lists are not in it. */
    leaderboard(by: LeaderboardBy, tag: string | null, viewer: number | null = null, limit = 50): ApiLeaderboard {
        const totals = new Map<number, { name: string; totals: Totals }>();

        if (tag === null) {
            const rows = this.db
                .prepare(
                    `SELECT p.id AS player_id, p.name, t.* FROM player_totals t JOIN players p ON p.id = t.player_id
                     WHERE p.public = 1`
                )
                .all() as unknown as Array<Parameters<typeof totalsFromRow>[0] & { player_id: number; name: string }>;

            for (const row of rows) {
                totals.set(row.player_id, { name: row.name, totals: totalsFromRow(row) });
            }
        } else {
            // The games of a tag: added up from the games, the same way the totals are
            const rows = this.db
                .prepare(
                    `SELECT gp.player_id, p.name AS current_name, gp.rank, gp.rounds_won, gp.stats_json, g.completed
                     FROM game_players gp JOIN games g ON g.id = gp.game_id JOIN players p ON p.id = gp.player_id
                     WHERE g.tag = ? AND p.public = 1 ORDER BY g.ended_at, g.id, gp.slot`
                )
                .all(tag) as unknown as Array<{
                player_id: number;
                current_name: string;
                rank: number;
                rounds_won: number;
                stats_json: string;
                completed: number;
            }>;

            for (const row of rows) {
                const entry = totals.get(row.player_id) ?? { name: row.current_name, totals: emptyTotals() };

                addGame(entry.totals, {
                    won: row.completed === 1 && row.rank === 1,
                    roundsWon: row.rounds_won,
                    counters: JSON.parse(row.stats_json)
                });
                totals.set(row.player_id, entry);
            }
        }

        const entries = [...totals.entries()]
            .map(([playerId, { name, totals: total }]) => ({
                playerId,
                name,
                games: total.games,
                wins: total.wins,
                winRate: total.games > 0 ? total.wins / total.games : 0,
                roundsWon: total.roundsWon,
                kills: total.kills,
                deaths: total.deaths
            }))
            .filter((entry) => by !== 'winRate' || entry.games >= minGamesForWinRate)
            .toSorted((a, b) => b[by] - a[by] || b.wins - a.wins || b.games - a.games || a.name.localeCompare(b.name))
            .slice(0, limit)
            .map(({ playerId, ...entry }, index): ApiLeaderboardEntry => ({
                rank: index + 1,
                ...entry,
                ...(viewer !== null && playerId === viewer ? { mine: true } : {})
            }));

        return { by, minGamesForWinRate, entries };
    }

    /** The best values ever seen, for all games or for the games of a tag; a record that nobody has is left out */
    records(tag: string | null): ApiRecords {
        const best = new Map<string, ApiRecord>();
        const offer = (
            id: string,
            value: number,
            row: { name: string; public: number | null },
            game: { id: number; ended_at: number; room: string }
        ) => {
            // The first to reach a value keeps the record
            if (value > 0 && value > (best.get(id)?.value ?? 0)) {
                best.set(id, {
                    id,
                    value,
                    name: shownName(row),
                    gameId: game.id,
                    endedAt: game.ended_at,
                    room: game.room
                });
            }
        };
        const rows = this.db
            .prepare(
                `SELECT gp.game_id, gp.slot, gp.name, gp.score, gp.rank, gp.stats_json, p.public,
                        g.id, g.ended_at, g.started_at, g.room, g.rounds
                 FROM game_players gp JOIN games g ON g.id = gp.game_id LEFT JOIN players p ON p.id = gp.player_id
                 WHERE (?1 IS NULL OR g.tag = ?1) ORDER BY g.ended_at, g.id, gp.slot`
            )
            .all(tag) as unknown as Array<{
            game_id: number;
            slot: number;
            name: string;
            score: number;
            rank: number;
            stats_json: string;
            public: number | null;
            id: number;
            ended_at: number;
            started_at: number;
            room: string;
            rounds: number;
        }>;

        for (const row of rows) {
            const counters = JSON.parse(row.stats_json) as Partial<PlayerCounters>;

            offer('highestScore', row.score, row, row);
            offer('longestStreak', counters.longestStreak ?? 0, row, row);
            offer('mostKills', counters.kills ?? 0, row, row);
            offer('longestLife', counters.longestLife ?? 0, row, row);
            offer('mostGapRuns', counters.gapRuns ?? 0, row, row);
            offer('mostBonuses', counters.bonuses ?? 0, row, row);
            offer('longestDistance', counters.distance ?? 0, row, row);

            // The game itself: credited to the winner
            if (row.rank === 1) {
                offer('longestGame', row.ended_at - row.started_at, row, row);
                offer('mostRounds', row.rounds, row, row);
            }
        }

        // Most feats of one player in one game: the number only, the feats stay secret
        const feats = this.db
            .prepare(
                `SELECT f.game_id, f.slot, COUNT(*) AS feats FROM feats f JOIN games g ON g.id = f.game_id
                 WHERE (?1 IS NULL OR g.tag = ?1) AND f.${currentFeats} GROUP BY f.game_id, f.slot ORDER BY g.ended_at, g.id, f.slot`
            )
            .all(tag) as Array<{ game_id: number; slot: number; feats: number }>;

        for (const { game_id: gameId, slot, feats: count } of feats) {
            const row = rows.find((candidate) => candidate.game_id === gameId && candidate.slot === slot);

            if (row) {
                offer('mostFeats', count, row, row);
            }
        }

        return { records: recordIds.flatMap((id) => best.get(id) ?? []) };
    }

    /** The tags that were used, the one used last first */
    tags(): ApiTags {
        const rows = this.db
            .prepare(
                `SELECT tag, COUNT(*) AS games FROM games WHERE tag IS NOT NULL GROUP BY tag ORDER BY MAX(ended_at) DESC`
            )
            .all() as Array<{ tag: string; games: number }>;

        return { tags: rows };
    }
}
