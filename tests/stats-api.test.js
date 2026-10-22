import http from 'node:http';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiLimit, createStatsApi } from '../src/server/core/StatsApi.ts';
import { hashIdentity } from '../src/server/core/identity.ts';
import { NullStorage } from '../src/server/storage/NullStorage.ts';
import { SqliteStorage } from '../src/server/storage/SqliteStorage.ts';
import { minGamesForWinRate } from '../src/server/storage/queries.ts';
import { statsVersion } from '../src/shared/model/GameStats.ts';
import { anonymous, secretFeat } from '../src/shared/model/StatsApi.ts';

const codes = { alice: 'alice-code-0123456789', bob: 'bob-code-0123456789ab', carl: 'carl-code-0123456789a' };

/** A player of a stored game: the identity is the hash of the code of the name, like the server keeps it */
function player(name, slot, rank, extra = {}) {
    return {
        slot,
        name,
        color: '#ffffff',
        rank,
        score: 10 - rank,
        roundsWon: 3 - rank,
        counters: { kills: 0, wallDeaths: 1 },
        identity: codes[name.toLowerCase()] ? hashIdentity(codes[name.toLowerCase()]) : null,
        ...extra
    };
}

let counter = 0;

/** A result: Alice wins against Bob (and Carl), the hunter award goes to Alice */
function result(overrides = {}) {
    counter++;

    return {
        startedAt: 1000 * counter,
        endedAt: 1000 * counter + 60_000,
        room: `room${counter}`,
        mode: 'classic',
        tag: null,
        rounds: 3,
        maxScore: 20,
        completed: true,
        config: { bonuses: [], variables: {} },
        statsVersion,
        players: [
            player('Alice', 0, 1, { counters: { kills: 4, wallDeaths: 0, longestLife: 30000, longestStreak: 3 } }),
            player('Bob', 1, 2),
            player('Carl', 2, 3)
        ],
        roundResults: [
            { round: 1, winner: 0, duration: 20000 },
            { round: 2, winner: null, duration: 10000 }
        ],
        feats: [
            { round: 1, slot: 0, feat: 'cleanSweep' },
            { round: 2, slot: 1, feat: 'revenge', other: 0 }
        ],
        ...overrides
    };
}

let storage;
let queries;

beforeEach(() => {
    counter = 0;
    storage = new SqliteStorage(':memory:', 'test');
    queries = storage.queries;
});

afterEach(() => storage.close());

describe('the games', () => {
    it('lists the latest first, with the players by rank and the number of feats', () => {
        storage.saveGame(result({ tag: 'daily' }));
        storage.saveGame(result());

        const { games, next } = queries.listGames({ limit: 20, before: null, tag: null });

        expect(next).toBeNull();
        expect(games.map(({ id }) => id)).toEqual([2, 1]);
        expect(games[1]).toMatchObject({ room: 'room1', tag: 'daily', rounds: 3, completed: true, feats: 2 });
        expect(games[1].players.map(({ name, rank }) => [name, rank])).toEqual([
            ['Alice', 1],
            ['Bob', 2],
            ['Carl', 3]
        ]);
    });

    it('pages with `before` and filters by tag', () => {
        for (const tag of ['daily', 'launch', 'daily', 'daily']) {
            storage.saveGame(result({ tag }));
        }

        const first = queries.listGames({ limit: 2, before: null, tag: null });

        expect(first.games.map(({ id }) => id)).toEqual([4, 3]);
        expect(first.next).toBe(3);
        expect(queries.listGames({ limit: 2, before: first.next, tag: null }).games.map(({ id }) => id)).toEqual([
            2, 1
        ]);
        expect(queries.listGames({ limit: 10, before: null, tag: 'daily' }).games.map(({ id }) => id)).toEqual([
            4, 3, 1
        ]);
        expect(queries.listGames({ limit: 10, before: null, tag: 'nothing' }).games).toEqual([]);
    });

    it('shows the name of a player who keeps out of the lists as Anonymous, except to themselves', () => {
        storage.saveGame(result());
        storage.db.prepare("UPDATE players SET public = 0 WHERE name = 'Bob'").run();

        const bob = queries.playerIdByIdentity(hashIdentity(codes.bob));
        const names = (viewer) =>
            queries.listGames({ limit: 5, before: null, tag: null }, viewer).games[0].players.map(({ name }) => name);

        expect(names(null)).toEqual(['Alice', anonymous, 'Carl']);
        expect(names(bob)).toEqual(['Alice', 'Bob', 'Carl']);
        expect(queries.listGames({ limit: 5, before: null, tag: null }, bob).games[0].players[1]).toMatchObject({
            mine: true
        });
    });

    it('is a game as it was shown at its end: counters, awards, rounds', () => {
        storage.saveGame(result());

        const { stats, players } = queries.getGame(1);

        expect(players).toHaveLength(3);
        expect(stats.players[0]).toMatchObject({
            id: 0,
            name: 'Alice',
            score: 9,
            roundsWon: 2,
            kills: 4,
            longestLife: 30000
        });
        // What the game did not count is zero
        expect(stats.players[1]).toMatchObject({ kills: 0, gapRuns: 0, bonusesByType: {} });
        expect(stats.awards).toContainEqual({ id: 'hunter', player: 0, value: 4 });
        expect(stats.rounds).toEqual([
            { round: 1, winner: 0, duration: 20000 },
            { round: 2, winner: null, duration: 10000 }
        ]);
    });

    it('does not tell what a feat was, except to the player who has it', () => {
        storage.saveGame(result());

        expect(queries.getGame(1).stats.feats).toEqual([
            { id: secretFeat, player: 0, round: 1 },
            { id: secretFeat, player: 1, round: 2 }
        ]);

        const bob = queries.playerIdByIdentity(hashIdentity(codes.bob));

        expect(queries.getGame(1, bob).stats.feats).toEqual([
            { id: secretFeat, player: 0, round: 1 },
            { id: 'revenge', player: 1, round: 2, other: 0 }
        ]);
    });

    it('is nothing when there is no such game', () => {
        expect(queries.getGame(99)).toBeNull();
    });
});

describe('the leaderboard', () => {
    beforeEach(() => {
        // Alice wins five games, Bob wins one (in the tag), Carl none
        for (let game = 0; game < 5; game++) {
            storage.saveGame(result({ tag: game < 2 ? 'daily' : null }));
        }

        storage.saveGame(
            result({
                tag: 'daily',
                players: [player('Alice', 0, 2), player('Bob', 1, 1, { counters: { kills: 7 } }), player('Carl', 2, 3)]
            })
        );
    });

    it('ranks by the wins, and tells what it did', () => {
        const { by, entries } = queries.leaderboard('wins', null);

        expect(by).toBe('wins');
        expect(entries.map(({ rank, name, games, wins }) => [rank, name, games, wins])).toEqual([
            [1, 'Alice', 6, 5],
            [2, 'Bob', 6, 1],
            [3, 'Carl', 6, 0]
        ]);
        expect(entries[0]).toMatchObject({ winRate: 5 / 6, roundsWon: 2 * 5 + 1 });
    });

    it('ranks by the kills, and by the win rate only players with enough games', () => {
        expect(queries.leaderboard('kills', null).entries.map(({ name }) => name)).toEqual(['Alice', 'Bob', 'Carl']);
        expect(queries.leaderboard('winRate', null).entries.map(({ name }) => name)).toEqual(['Alice', 'Bob', 'Carl']);

        // Fewer games than the minimum: not ranked by the win rate
        const fresh = new SqliteStorage(':memory:');

        fresh.saveGame(result());
        expect(minGamesForWinRate).toBeGreaterThan(1);
        expect(fresh.queries.leaderboard('winRate', null).entries).toEqual([]);
        expect(fresh.queries.leaderboard('wins', null).entries).toHaveLength(3);
        fresh.close();
    });

    it('adds up the games of a tag from the games, not from the totals', () => {
        const { entries } = queries.leaderboard('wins', 'daily');

        expect(entries.map(({ name, games, wins, kills }) => [name, games, wins, kills])).toEqual([
            ['Alice', 3, 2, 8],
            ['Bob', 3, 1, 7],
            ['Carl', 3, 0, 0]
        ]);
    });

    it('leaves out the players who keep out of the lists, and marks the viewer', () => {
        storage.db.prepare("UPDATE players SET public = 0 WHERE name = 'Alice'").run();

        const carl = queries.playerIdByIdentity(hashIdentity(codes.carl));
        const { entries } = queries.leaderboard('wins', null, carl);

        expect(entries.map(({ name, mine }) => [name, mine])).toEqual([
            ['Bob', undefined],
            ['Carl', true]
        ]);
        expect(queries.leaderboard('wins', 'daily').entries.map(({ name }) => name)).toEqual(['Bob', 'Carl']);
    });

    it('does not rank players without an identity', () => {
        storage.saveGame(result({ players: [player('Guest', 0, 1), player('Alice', 1, 2)] }));

        expect(queries.leaderboard('games', null).entries.map(({ name }) => name)).not.toContain('Guest');
    });
});

describe('the records', () => {
    it('are the best values, credited to the first who reached them', () => {
        storage.saveGame(result({ tag: 'daily' }));
        storage.saveGame(result({ players: [player('Alice', 0, 1, { counters: { kills: 4 } }), player('Bob', 1, 2)] }));
        storage.saveGame(
            result({
                tag: 'daily',
                feats: [
                    { round: 1, slot: 2, feat: 'cleanSweep' },
                    { round: 1, slot: 2, feat: 'doubleKill' },
                    { round: 2, slot: 2, feat: 'revenge' }
                ]
            })
        );

        const byId = Object.fromEntries(queries.records(null).records.map((record) => [record.id, record]));

        expect(byId.mostKills).toMatchObject({ value: 4, name: 'Alice', gameId: 1 });
        expect(byId.longestStreak).toMatchObject({ value: 3, name: 'Alice' });
        expect(byId.longestLife).toMatchObject({ value: 30000 });
        expect(byId.mostFeats).toMatchObject({ value: 3, name: 'Carl', gameId: 3 });
        // Nothing was counted for these: no record
        expect(byId).not.toHaveProperty('mostGapRuns');
        expect(queries.records('daily').records.find(({ id }) => id === 'mostKills')).toMatchObject({ gameId: 1 });
        expect(queries.records('nothing').records).toEqual([]);
    });

    it('name nobody who keeps out of the lists', () => {
        storage.saveGame(result());
        storage.db.prepare("UPDATE players SET public = 0 WHERE name = 'Alice'").run();

        expect(queries.records(null).records.find(({ id }) => id === 'mostKills').name).toBe(anonymous);
    });
});

describe('the tags', () => {
    it('are the ones that were used, the latest first, with their games', () => {
        for (const tag of ['daily', 'launch', 'daily', null]) {
            storage.saveGame(result({ tag }));
        }

        expect(queries.tags()).toEqual({
            tags: [
                { tag: 'daily', games: 2 },
                { tag: 'launch', games: 1 }
            ]
        });
    });
});

describe('the HTTP interface', () => {
    let server;
    let base;

    async function serve(kept) {
        const app = express();

        app.use('/api', createStatsApi(kept));
        server = http.createServer(app);
        await new Promise((resolve) => server.listen(0, resolve));
        base = `http://localhost:${server.address().port}/api`;
    }

    afterEach(() => server?.close());

    const get = (path, headers = {}) => fetch(`${base}${path}`, { headers });

    it('answers with the games, the leaderboard, the records and the tags', async () => {
        storage.saveGame(result({ tag: 'daily' }));
        await serve(storage);

        const games = await (await get('/games?limit=5')).json();

        expect(games.games).toHaveLength(1);
        expect(games.next).toBeNull();
        expect((await (await get('/games/1')).json()).stats.players).toHaveLength(3);
        expect((await (await get('/leaderboard?by=kills&tag=Daily')).json()).entries).toHaveLength(3);
        expect((await (await get('/records')).json()).records.length).toBeGreaterThan(0);
        expect(await (await get('/tags')).json()).toEqual({ tags: [{ tag: 'daily', games: 1 }] });
    });

    it('says no to what it does not understand', async () => {
        await serve(storage);

        for (const path of [
            '/games?limit=0',
            '/games?limit=101',
            '/games?limit=x',
            '/games?before=-1',
            '/games?tag=!!!'
        ]) {
            expect((await get(path)).status, path).toBe(400);
        }

        expect((await get('/leaderboard?by=score')).status).toBe(400);
        expect((await get('/games/abc')).status).toBe(404);
        expect((await get('/games/99')).status).toBe(404);
        expect((await get('/nothing')).status).toBe(404);
        expect((await fetch(`${base}/games`, { method: 'POST' })).status).toBe(404);
    });

    it('does not take what comes in the query as SQL', async () => {
        storage.saveGame(result());
        await serve(storage);

        const response = await get(`/games?tag=${encodeURIComponent("x'; DROP TABLE games;--")}`);

        expect(response.status).toBe(200);
        expect((await get('/games')).status).toBe(200);
        expect((await (await get('/games')).json()).games).toHaveLength(1);
    });

    it('keeps the secret feats secret in what it sends', async () => {
        storage.saveGame(result());
        await serve(storage);

        const text = await (await get('/games/1')).text();

        expect(text).not.toContain('cleanSweep');
        expect(text).not.toContain('revenge');
        expect(text).toContain(secretFeat);
    });

    it('tells more to the one who sends their identity, and does not let a cache keep it', async () => {
        storage.saveGame(result());
        await serve(storage);

        const anonymousResponse = await get('/games/1');
        const ownResponse = await get('/games/1', { 'X-Identity': codes.bob });

        expect(anonymousResponse.headers.get('cache-control')).toMatch(/max-age/);
        expect(ownResponse.headers.get('cache-control')).toBe('no-store');
        expect((await ownResponse.json()).stats.feats.map(({ id }) => id)).toEqual([secretFeat, 'revenge']);
        // Not a code, or an unknown one: nothing more than anybody
        expect((await (await get('/games/1', { 'X-Identity': 'x' })).json()).stats.feats.map(({ id }) => id)).toEqual([
            secretFeat,
            secretFeat
        ]);
    });

    it('is not there when nothing is kept', async () => {
        await serve(new NullStorage());

        expect((await get('/games')).status).toBe(503);
        expect((await get('/tags')).status).toBe(503);
    });

    it('limits the requests of one address', async () => {
        await serve(storage);

        const before = apiLimit.requests;

        apiLimit.requests = 3;

        try {
            const statuses = [];

            for (let i = 0; i < 5; i++) {
                statuses.push((await get('/tags')).status);
            }

            expect(statuses).toEqual([200, 200, 200, 429, 429]);
        } finally {
            apiLimit.requests = before;
        }
    });
});
