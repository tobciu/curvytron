import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { GameResult } from '../../shared/model/GameResult.ts';
import { migrate } from './schema.ts';
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
    insertGame: StatementSync;
    insertPlayer: StatementSync;
    insertRound: StatementSync;
    insertFeat: StatementSync;
    countGames: StatementSync;

    /**
     * @param file Path of the database, `:memory:` for one that is gone with the server (tests)
     * @param version Version of the game, stored with every game
     */
    constructor(file: string, version: string = 'unknown') {
        this.file = file;
        this.version = version;
        this.db = new DatabaseSync(file);

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
                 VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`
            );
            this.insertRound = this.db.prepare(
                'INSERT INTO rounds (game_id, round, winner_slot, duration_ms) VALUES (?, ?, ?, ?)'
            );
            this.insertFeat = this.db.prepare(
                'INSERT INTO feats (game_id, round, slot, feat, other_slot) VALUES (?, ?, ?, ?, ?)'
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

            for (const player of result.players) {
                this.insertPlayer.run(
                    id,
                    player.slot,
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

    status(): StorageStatus {
        const { games } = this.countGames.get() as { games: number };

        return { state: 'ok', file: this.file, games };
    }

    close(): void {
        this.db.close();
    }
}
