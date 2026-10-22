import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvatarBody } from '../src/server/core/AvatarBody.ts';
import { metrics } from '../src/server/service/Metrics.ts';
import { NullStorage } from '../src/server/storage/NullStorage.ts';
import { SqliteStorage } from '../src/server/storage/SqliteStorage.ts';
import { createStorage } from '../src/server/storage/index.ts';
import { migrate, migrations } from '../src/server/storage/schema.ts';
import { buildGameResult } from '../src/server/storage/result.ts';
import { statsVersion } from '../src/shared/model/GameStats.ts';
import { createGame } from './helpers/game.js';

/** A result as `buildGameResult` makes it */
function sampleResult(overrides = {}) {
    return {
        startedAt: 1000,
        endedAt: 61000,
        room: 'arena',
        mode: 'classic',
        tag: 'daily',
        rounds: 2,
        maxScore: 20,
        completed: true,
        config: { bonuses: ['BonusSelfFast'], variables: { bonusRate: 0 } },
        statsVersion,
        players: [
            { slot: 0, name: 'Alice', color: '#f00', rank: 1, score: 21, roundsWon: 2, counters: { kills: 3 } },
            { slot: 1, name: 'Bob', color: '#00f', rank: 2, score: 5, roundsWon: 0, counters: { kills: 0 } }
        ],
        roundResults: [
            { round: 1, winner: 0, duration: 12000 },
            { round: 2, winner: null, duration: 8000 }
        ],
        feats: [
            { round: 1, slot: 0, feat: 'cleanSweep' },
            { round: 2, slot: 1, feat: 'revenge', other: 0 }
        ],
        ...overrides
    };
}

describe('the schema', () => {
    it('brings an empty database to the latest version, once', () => {
        const db = new DatabaseSync(':memory:');

        migrate(db);
        migrate(db);

        expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: migrations.length });
        expect(
            db
                .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
                .all()
                .map(({ name }) => name)
        ).toEqual(['feats', 'game_players', 'games', 'players', 'rounds']);
    });

    it('refuses a database of a newer version than the server knows', () => {
        const db = new DatabaseSync(':memory:');

        db.exec(`PRAGMA user_version = ${migrations.length + 1}`);

        expect(() => migrate(db)).toThrow(/update the server/);
    });

    it('does nothing of a step that failed', () => {
        const db = new DatabaseSync(':memory:');

        db.exec('CREATE TABLE games (id INTEGER)');

        expect(() => migrate(db)).toThrow();
        expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 0 });
        expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'players'").get()).toBeUndefined();
    });
});

describe('the SQLite storage', () => {
    let storage;

    beforeEach(() => {
        storage = new SqliteStorage(':memory:', '3.1.0');
    });

    afterEach(() => storage.close());

    it('keeps a game with its players, rounds and feats', () => {
        storage.saveGame(sampleResult());

        expect(storage.db.prepare('SELECT * FROM games').all()).toEqual([
            {
                id: 1,
                started_at: 1000,
                ended_at: 61000,
                room: 'arena',
                mode: 'classic',
                tag: 'daily',
                rounds: 2,
                max_score: 20,
                completed: 1,
                config_json: '{"bonuses":["BonusSelfFast"],"variables":{"bonusRate":0}}',
                app_version: '3.1.0',
                stats_version: statsVersion
            }
        ]);
        expect(
            storage.db
                .prepare('SELECT slot, player_id, name, rank, score, rounds_won, stats_json FROM game_players')
                .all()
        ).toEqual([
            { slot: 0, player_id: null, name: 'Alice', rank: 1, score: 21, rounds_won: 2, stats_json: '{"kills":3}' },
            { slot: 1, player_id: null, name: 'Bob', rank: 2, score: 5, rounds_won: 0, stats_json: '{"kills":0}' }
        ]);
        expect(storage.db.prepare('SELECT round, winner_slot, duration_ms FROM rounds').all()).toEqual([
            { round: 1, winner_slot: 0, duration_ms: 12000 },
            { round: 2, winner_slot: null, duration_ms: 8000 }
        ]);
        expect(storage.db.prepare('SELECT round, slot, feat, other_slot FROM feats').all()).toEqual([
            { round: 1, slot: 0, feat: 'cleanSweep', other_slot: null },
            { round: 2, slot: 1, feat: 'revenge', other_slot: 0 }
        ]);
    });

    it('keeps a game without a tag and without a winner', () => {
        storage.saveGame(sampleResult({ tag: null, completed: false, feats: [], roundResults: [] }));

        expect(storage.db.prepare('SELECT tag, completed FROM games').get()).toEqual({ tag: null, completed: 0 });
    });

    it('keeps everything or nothing', () => {
        // The same slot twice: the second player can not be written
        const broken = sampleResult({ players: [sampleResult().players[0], sampleResult().players[0]] });

        expect(() => storage.saveGame(broken)).toThrow();
        expect(storage.db.prepare('SELECT COUNT(*) AS games FROM games').get()).toEqual({ games: 0 });

        // ... and the storage is usable afterwards
        storage.saveGame(sampleResult());

        expect(storage.status()).toEqual({ state: 'ok', file: ':memory:', games: 1 });
    });

    it('does not write what comes from the players as SQL', () => {
        const name = "Robert'); DROP TABLE games;--";

        storage.saveGame(sampleResult({ room: name, players: [{ ...sampleResult().players[0], name }] }));

        expect(storage.db.prepare('SELECT room FROM games').get()).toEqual({ room: name });
    });
});

describe('creating the storage', () => {
    it('keeps nothing when it is disabled', async () => {
        const storage = await createStorage({ enabled: false }, tmpdir(), '1.0.0');

        expect(storage).toBeInstanceOf(NullStorage);
        expect(storage.status()).toEqual({ state: 'off' });
    });

    it('opens the file of the configuration, and makes the directory', async () => {
        const root = mkdtempSync(path.join(tmpdir(), 'curvytron-'));
        const storage = await createStorage({ file: 'nested/games.db' }, root, '1.0.0', undefined);

        try {
            expect(storage).toBeInstanceOf(SqliteStorage);
            expect(storage.status()).toMatchObject({ state: 'ok', file: path.join(root, 'nested/games.db') });
        } finally {
            storage.close();
        }
    });

    it('prefers the file of the environment variable', async () => {
        const storage = await createStorage({ file: 'config.db' }, tmpdir(), '1.0.0', ':memory:');

        try {
            expect(storage.status()).toMatchObject({ file: ':memory:' });
        } finally {
            storage.close();
        }
    });

    it('goes on without it when it can not be opened', async () => {
        const root = mkdtempSync(path.join(tmpdir(), 'curvytron-'));

        // The directory of the database is a file
        writeFileSync(path.join(root, 'data'), 'in the way');

        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const storage = await createStorage({}, root, '1.0.0', undefined);

        expect(storage).toBeInstanceOf(NullStorage);
        expect(storage.status()).toMatchObject({ state: 'error', error: expect.any(String) });
        expect(error).toHaveBeenCalled();

        error.mockRestore();
    });
});

describe('the result of a game', () => {
    let game;
    let alice;
    let bob;
    let carl;

    function startRound() {
        game.newRound();
        game.started = true;
        game.world.activate();
        game.bonusManager.world.activate();
        vi.clearAllTimers();
        game.emit('game:start', { game });
    }

    /** The victim crashes on the trail of the killer */
    const crash = (victim, killer) => game.kill(victim, killer ? new AvatarBody(0, 0, killer) : null, 0);

    beforeEach(() => {
        vi.useFakeTimers();
        ({
            game,
            avatars: [alice, bob, carl]
        } = createGame());
        game.avatars.items.forEach((avatar) => avatar.printManager.stop());
        game.room.tag = 'daily';
    });

    afterEach(() => {
        game.avatars?.items.forEach((avatar) => avatar.printManager.stop());
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it('has the players with their rank, the rounds and the feats', () => {
        startRound();
        crash(bob, alice);
        vi.advanceTimersByTime(500);
        crash(carl, alice);
        alice.setScore(5);
        bob.setScore(3);
        carl.setScore(3);
        game.emit('round:end', { winner: alice });

        const result = buildGameResult(game, Date.now() + 1000);

        expect(result).toMatchObject({
            room: 'test',
            mode: 'classic',
            tag: 'daily',
            rounds: 1,
            completed: false,
            statsVersion,
            roundResults: [{ round: 1, winner: 0, duration: expect.any(Number) }]
        });
        expect(result.players.map(({ name, rank, score, roundsWon }) => [name, rank, score, roundsWon])).toEqual([
            ['Alice', 1, 5, 1],
            ['Bob', 2, 3, 0],
            ['Carl', 2, 3, 0]
        ]);
        expect(result.players[0].counters).toMatchObject({ kills: 2 });
        expect(result.players[0].counters).not.toHaveProperty('name');
        expect(result.feats).toContainEqual({ round: 1, slot: 0, feat: 'doubleKill' });
        expect(result.endedAt - result.startedAt).toBeGreaterThanOrEqual(1000);
    });

    it('never has the password of the room', () => {
        startRound();
        game.emit('round:end', { winner: null });
        game.room.config.setOpen(false);

        const { config } = buildGameResult(game);

        expect(JSON.stringify(config)).not.toContain(String(game.room.config.password));
        expect(Object.keys(config).toSorted()).toEqual(['bonuses', 'variables']);
    });

    it('is handed to the storage of the room when the game ends, once there was a round', () => {
        const saveGame = vi.fn();

        game.room.storage = { saveGame, status: () => ({ state: 'ok' }), close: vi.fn() };

        game.emit('end', { game });

        expect(saveGame).not.toHaveBeenCalled();

        startRound();
        game.emit('round:end', { winner: alice });
        game.emit('end', { game });

        expect(saveGame).toHaveBeenCalledTimes(1);
        expect(saveGame.mock.calls[0][0]).toMatchObject({ room: 'test', rounds: 1 });
    });

    it('never disturbs the game when the storage fails', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const before = metrics.storageErrors.values.get('')?.value ?? 0;

        game.room.storage = {
            saveGame: () => {
                throw new Error('disk full');
            },
            status: () => ({ state: 'ok' }),
            close: vi.fn()
        };
        startRound();
        game.emit('round:end', { winner: alice });

        expect(() => game.emit('end', { game })).not.toThrow();
        expect(metrics.storageErrors.values.get('').value).toBe(before + 1);

        error.mockRestore();
    });
});
