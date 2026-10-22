import type { DatabaseSync } from 'node:sqlite';

/**
 * The tables, as a list of steps: the version of a database is the number of steps done (`PRAGMA user_version`), the
 * server does the missing ones when it starts. Never change a step that was released, add a new one.
 */
export const migrations: readonly string[] = [
    // 1: the games (the players of the games are guests until the identity of a browser is known)
    `
    -- Who played (anonymous): one entry per identity, filled when the browsers have an identity
    CREATE TABLE players (
        id            INTEGER PRIMARY KEY,
        identity_hash TEXT NOT NULL UNIQUE,
        name          TEXT NOT NULL,
        public        INTEGER NOT NULL DEFAULT 1,
        created_at    INTEGER NOT NULL,
        last_seen     INTEGER NOT NULL
    );

    CREATE TABLE games (
        id            INTEGER PRIMARY KEY,
        started_at    INTEGER NOT NULL,
        ended_at      INTEGER NOT NULL,
        room          TEXT NOT NULL,
        mode          TEXT NOT NULL DEFAULT 'classic',
        tag           TEXT,
        rounds        INTEGER NOT NULL,
        max_score     INTEGER NOT NULL,
        completed     INTEGER NOT NULL,
        config_json   TEXT NOT NULL,
        app_version   TEXT NOT NULL,
        stats_version INTEGER NOT NULL
    );

    CREATE TABLE game_players (
        game_id       INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        slot          INTEGER NOT NULL,
        player_id     INTEGER REFERENCES players(id) ON DELETE SET NULL,
        name          TEXT NOT NULL,
        color         TEXT NOT NULL,
        rank          INTEGER NOT NULL,
        score         INTEGER NOT NULL,
        rounds_won    INTEGER NOT NULL,
        stats_json    TEXT NOT NULL,
        PRIMARY KEY (game_id, slot)
    );

    CREATE TABLE rounds (
        game_id       INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        round         INTEGER NOT NULL,
        winner_slot   INTEGER,
        duration_ms   INTEGER NOT NULL,
        PRIMARY KEY (game_id, round)
    );

    CREATE TABLE feats (
        game_id       INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        round         INTEGER NOT NULL,
        slot          INTEGER NOT NULL,
        feat          TEXT NOT NULL,
        other_slot    INTEGER
    );

    CREATE INDEX game_players_player ON game_players(player_id);
    CREATE INDEX feats_game ON feats(game_id);
    CREATE INDEX games_ended ON games(ended_at DESC);
    CREATE INDEX games_tag ON games(tag, ended_at DESC);
    `,
    // 2: the totals of the players, for the leaderboard (they can be built again from the games)
    `
    CREATE TABLE player_totals (
        player_id     INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
        games         INTEGER NOT NULL DEFAULT 0,
        wins          INTEGER NOT NULL DEFAULT 0,
        rounds_won    INTEGER NOT NULL DEFAULT 0,
        kills         INTEGER NOT NULL DEFAULT 0,
        deaths        INTEGER NOT NULL DEFAULT 0,
        totals_json   TEXT NOT NULL DEFAULT '{}'
    );
    `
];

/**
 * Bring a database to the latest version. A database of a newer version than this server knows is refused: it would
 * be written to in a way that its owner does not expect.
 */
export function migrate(db: DatabaseSync): void {
    const { user_version: version } = db.prepare('PRAGMA user_version').get() as { user_version: number };

    if (version > migrations.length) {
        throw new Error(
            `The database is of version ${version}, this server knows up to ${migrations.length}: update the server`
        );
    }

    for (let step = version; step < migrations.length; step++) {
        db.exec('BEGIN');

        try {
            db.exec(migrations[step]);
            db.exec(`PRAGMA user_version = ${step + 1}`);
            db.exec('COMMIT');
        } catch (error) {
            db.exec('ROLLBACK');

            throw error;
        }
    }
}
