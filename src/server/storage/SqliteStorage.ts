import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { GameResult } from '../../shared/model/GameResult.ts';
import { Accounts } from './accounts.ts';
import { StatsQueries } from './queries.ts';
import { migrate } from './schema.ts';
import { addGame, emptyTotals, totalsFromRow, totalsJson, type Totals } from './totals.ts';
import type { Storage, StorageStatus } from './Storage.ts';

/**
 * The results of the games in a SQLite database (the one of Node: no dependency to build).
 *
 * The calls are synchronous: a game is written once, at its end, in a few milliseconds at most.
 */
export class SqliteStorage implements Storage {
    file: string;
    version: string;
    db: DatabaseSync;
    queries: StatsQueries;
    accounts: Accounts;
    insertGame: StatementSync;
    insertPlayer: StatementSync;
    insertRound: StatementSync;
    insertFeat: StatementSync;
    upsertIdentity: StatementSync;
    selectTotals: StatementSync;
    writeTotals: StatementSync;
    countGames: StatementSync;

    /**
     * @param file Path of the database, `:memory:` for one that is gone with the server (tests)
     * @param version Version of the game, stored with every game
     */
    constructor(file: string, version: string = 'unknown') {
        this.file = file;
        this.version = version;
        this.db = new DatabaseSync(file);
        this.queries = new StatsQueries(this.db);
        this.accounts = new Accounts(this.db);

        try {
            this.db.exec('PRAGMA journal_mode = WAL');
            this.db.exec('PRAGMA foreign_keys = ON');
            this.db.exec('PRAGMA busy_timeout = 2000');

            migrate(this.db);

            this.insertGame = this.db.prepare(
                `INSERT INTO games (started_at, ended_at, room, mode, tag, rounds, max_score, completed, config_json,
                                    app_version, stats_version)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            );
            this.insertPlayer = this.db.prepare(
                `INSERT INTO game_players (game_id, slot, player_id, name, color, rank, score, rounds_won, stats_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            );
            this.insertRound = this.db.prepare(
                'INSERT INTO rounds (game_id, round, winner_slot, duration_ms) VALUES (?, ?, ?, ?)'
            );
            this.insertFeat = this.db.prepare(
                'INSERT INTO feats (game_id, round, slot, feat, other_slot) VALUES (?, ?, ?, ?, ?)'
            );
            this.upsertIdentity = this.db.prepare(
                `INSERT INTO players (identity_hash, name, created_at, last_seen) VALUES (?, ?, ?, ?)
                 ON CONFLICT(identity_hash) DO UPDATE SET name = excluded.name, last_seen = excluded.last_seen
                 RETURNING id`
            );
            this.selectTotals = this.db.prepare('SELECT * FROM player_totals WHERE player_id = ?');
            this.writeTotals = this.db.prepare(
                `INSERT OR REPLACE INTO player_totals (player_id, games, wins, rounds_won, kills, deaths, totals_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
            );
            this.countGames = this.db.prepare('SELECT COUNT(*) AS games FROM games');
        } catch (error) {
            this.db.close();

            throw error;
        }
    }

    /**
     * Keep a game: everything or nothing
     */
    saveGame(result: GameResult): void {
        this.db.exec('BEGIN IMMEDIATE');

        try {
            const { lastInsertRowid: id } = this.insertGame.run(
                result.startedAt,
                result.endedAt,
                result.room,
                result.mode,
                result.tag,
                result.rounds,
                result.maxScore,
                result.completed ? 1 : 0,
                JSON.stringify(result.config),
                this.version,
                result.statsVersion
            );

            const identities = new Set<string>();

            for (const player of result.players) {
                // The player of a browser with an identity has an entry of its own, and the totals grow (once per
                // identity and game, whatever the result says)
                let playerId: number | bigint | null = null;

                if (player.identity && !identities.has(player.identity)) {
                    identities.add(player.identity);

                    const row = this.upsertIdentity.get(
                        player.identity,
                        player.name,
                        result.endedAt,
                        result.endedAt
                    ) as { id: number };

                    playerId = row.id;
                    this.addToTotals(playerId, { won: result.completed && player.rank === 1, ...player });
                }

                this.insertPlayer.run(
                    id,
                    player.slot,
                    playerId,
                    player.name,
                    player.color,
                    player.rank,
                    player.score,
                    player.roundsWon,
                    JSON.stringify(player.counters)
                );
            }

            for (const round of result.roundResults) {
                this.insertRound.run(id, round.round, round.winner, round.duration);
            }

            for (const feat of result.feats) {
                this.insertFeat.run(id, feat.round, feat.slot, feat.feat, feat.other ?? null);
            }

            this.db.exec('COMMIT');
        } catch (error) {
            this.db.exec('ROLLBACK');

            throw error;
        }
    }

    /** One more game in the totals of a player */
    private addToTotals(
        playerId: number | bigint,
        game: { won: boolean; roundsWon: number; counters: GameResult['players'][number]['counters'] }
    ): void {
        const row = this.selectTotals.get(playerId) as Parameters<typeof totalsFromRow>[0] | undefined;
        const totals = addGame(row ? totalsFromRow(row) : emptyTotals(), game);

        this.writeTotals.run(
            playerId,
            totals.games,
            totals.wins,
            totals.roundsWon,
            totals.kills,
            totals.deaths,
            totalsJson(totals)
        );
    }

    /**
     * Build the totals again from the games: after a change of how they are counted, or to check them. The result is
     * the same as when they grew game by game.
     */
    rebuildTotals(): number {
        const rows = this.db
            .prepare(
                `SELECT gp.player_id, gp.rank, gp.rounds_won, gp.stats_json, g.completed
                 FROM game_players gp JOIN games g ON g.id = gp.game_id
                 WHERE gp.player_id IS NOT NULL
                 ORDER BY g.ended_at, g.id, gp.slot`
            )
            .all() as Array<{
            player_id: number;
            rank: number;
            rounds_won: number;
            stats_json: string;
            completed: number;
        }>;
        const totals = new Map<number, Totals>();

        for (const row of rows) {
            const current = totals.get(row.player_id) ?? emptyTotals();

            totals.set(
                row.player_id,
                addGame(current, {
                    won: row.completed === 1 && row.rank === 1,
                    roundsWon: row.rounds_won,
                    counters: JSON.parse(row.stats_json)
                })
            );
        }

        this.db.exec('BEGIN IMMEDIATE');

        try {
            this.db.exec('DELETE FROM player_totals');

            for (const [playerId, total] of totals) {
                this.writeTotals.run(
                    playerId,
                    total.games,
                    total.wins,
                    total.roundsWon,
                    total.kills,
                    total.deaths,
                    totalsJson(total)
                );
            }

            this.db.exec('COMMIT');
        } catch (error) {
            this.db.exec('ROLLBACK');

            throw error;
        }

        return totals.size;
    }

    status(): StorageStatus {
        const { games } = this.countGames.get() as { games: number };

        return { state: 'ok', file: this.file, games };
    }

    close(): void {
        this.db.close();
    }
}
