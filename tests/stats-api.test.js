import http from 'node:http';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiLimit, createStatsApi } from '../src/server/core/StatsApi.ts';
import { hashIdentity } from '../src/server/core/identity.ts';
import { NullStorage } from '../src/server/storage/NullStorage.ts';
import { SqliteStorage } from '../src/server/storage/SqliteStorage.ts';
import { minGamesForWinRate } from '../src/server/storage/queries.ts';
import { statsVersion } from '../src/shared/model/GameStats.ts';
import { anonymous } from '../src/shared/model/StatsApi.ts';

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

    it('does not list the feats of the others, only their number, and lists the ones of the viewer', () => {
        storage.saveGame(result());

        const game = queries.getGame(1);

        expect(game.stats.feats).toEqual([]);
        expect(game.hiddenFeats).toBe(2);
        expect(game.feats).toBe(2);

        const bob = queries.playerIdByIdentity(hashIdentity(codes.bob));
        const own = queries.getGame(1, bob);

        expect(own.stats.feats).toEqual([{ id: 'revenge', player: 1, round: 2, other: 0 }]);
        expect(own.hiddenFeats).toBe(1);
        expect(own.feats).toBe(2);
    });

    it('does not count the feats that are not given anymore', () => {
        storage.saveGame(
            result({
                feats: [
                    { round: 1, slot: 0, feat: 'graveKill' },
                    { round: 2, slot: 1, feat: 'badKarma' }
                ]
            })
        );

        const game = queries.getGame(1);

        expect(game.feats).toBe(1);
        expect(game.hiddenFeats).toBe(1);
        expect(queries.listGames({ limit: 10, before: null, tag: null }).games[0].feats).toBe(1);
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
    });

    it('tells more to the one who sends their identity, and does not let a cache keep it', async () => {
        storage.saveGame(result());
        await serve(storage);

        const anonymousResponse = await get('/games/1');
        const ownResponse = await get('/games/1', { 'X-Identity': codes.bob });

        expect(anonymousResponse.headers.get('cache-control')).toMatch(/max-age/);
        expect(ownResponse.headers.get('cache-control')).toBe('no-store');
        expect((await ownResponse.json()).stats.feats.map(({ id }) => id)).toEqual(['revenge']);
        // Not a code, or an unknown one: nothing more than anybody
        expect((await (await get('/games/1', { 'X-Identity': 'x' })).json()).stats.feats).toEqual([]);
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

describe('the entry of a player', () => {
    const hash = (name) => hashIdentity(codes[name]);

    beforeEach(() => {
        for (let game = 0; game < 2; game++) {
            storage.saveGame(result());
        }
    });

    it('tells a player their totals and their feats, with the real names, and the other of a feat', () => {
        const me = storage.accounts.me(hash('bob'));

        expect(me).toMatchObject({
            known: true,
            name: 'Bob',
            public: true,
            totals: { games: 2, wins: 0, roundsWon: 2, deaths: 2 }
        });
        expect(me.feats.map(({ id, round, gameId, other }) => [id, round, gameId, other])).toEqual([
            ['revenge', 2, 2, 'Alice'],
            ['revenge', 2, 1, 'Alice']
        ]);
        expect(storage.accounts.me(hash('alice')).totals).toMatchObject({
            wins: 2,
            bestLife: 30000,
            bestStreak: 3,
            kills: 8
        });
    });

    it('does not know a stranger', () => {
        expect(storage.accounts.me(hashIdentity('somebody-else-0123456789'))).toEqual({ known: false });
    });

    it('names nobody who keeps out of the lists as the other of a feat', () => {
        storage.db.prepare("UPDATE players SET public = 0 WHERE name = 'Alice'").run();

        expect(storage.accounts.me(hash('bob')).feats[0].other).toBe(anonymous);
    });

    it('keeps a player out of the lists, and back in, even before their first game', () => {
        const dora = hashIdentity('dora-code-0123456789ab');

        storage.accounts.setPublic(dora, false);

        expect(storage.accounts.me(dora)).toMatchObject({ known: true, public: false, totals: { games: 0 } });

        // Her first game gives the entry her name, and she stays out of the lists
        storage.saveGame(result({ players: [player('Dora', 0, 1, { identity: dora }), player('Bob', 1, 2)] }));

        expect(storage.accounts.me(dora)).toMatchObject({ name: 'Dora', public: false, totals: { games: 1 } });
        expect(queries.leaderboard('games', null).entries.map(({ name }) => name)).not.toContain('Dora');

        storage.accounts.setPublic(dora, true);

        expect(queries.leaderboard('games', null).entries.map(({ name }) => name)).toContain('Dora');
    });

    it('gives the same player a new code, with their history, and the old code is worth nothing', () => {
        const fresh = hashIdentity('alice-new-code-0123456789');

        expect(storage.accounts.rotate(hash('alice'), fresh)).toBe('ok');
        expect(storage.accounts.me(fresh)).toMatchObject({ known: true, name: 'Alice', totals: { games: 2, wins: 2 } });
        expect(storage.accounts.me(hash('alice'))).toEqual({ known: false });

        // The next game of the new code goes on with the same totals
        storage.saveGame(result({ players: [player('Alice', 0, 1, { identity: fresh }), player('Bob', 1, 2)] }));

        expect(storage.accounts.me(fresh).totals.games).toBe(3);
        expect(storage.db.prepare('SELECT COUNT(*) AS players FROM players').get()).toEqual({ players: 3 });
    });

    it('does not give a code that is somebody else’s, nor take one from a code without history', () => {
        expect(storage.accounts.rotate(hash('alice'), hash('bob'))).toBe('taken');
        expect(storage.accounts.rotate(hashIdentity('nobody-0123456789abcdef'), hashIdentity('x'.repeat(20)))).toBe(
            'unknown'
        );
        expect(storage.accounts.rotate(hash('alice'), hash('alice'))).toBe('ok');
        expect(storage.accounts.me(hash('alice'))).toMatchObject({ known: true });
    });

    it('forgets a player: entry and totals are gone, the games stay without their name', () => {
        expect(storage.accounts.forget(hash('bob'))).toBe(true);
        expect(storage.accounts.forget(hash('bob'))).toBe(false);

        expect(storage.accounts.me(hash('bob'))).toEqual({ known: false });
        expect(storage.db.prepare('SELECT COUNT(*) AS totals FROM player_totals').get()).toEqual({ totals: 2 });
        expect(queries.getGame(1).players.map(({ name }) => name)).toEqual(['Alice', anonymous, 'Carl']);
        expect(queries.leaderboard('games', null).entries.map(({ name }) => name)).toEqual(['Alice', 'Carl']);
        expect(storage.db.prepare('SELECT COUNT(*) AS games FROM games').get()).toEqual({ games: 2 });
    });
});

describe('the HTTP interface for the own entry', () => {
    let server;
    let base;

    beforeEach(async () => {
        storage.saveGame(result());

        const app = express();

        app.use('/api', createStatsApi(storage));
        server = http.createServer(app);
        await new Promise((resolve) => server.listen(0, resolve));
        base = `http://localhost:${server.address().port}/api`;
    });

    afterEach(() => server.close());

    const call = (method, path, code, body) =>
        fetch(`${base}${path}`, {
            method,
            headers: {
                ...(code ? { 'X-Identity': code } : {}),
                ...(body ? { 'Content-Type': 'application/json' } : {})
            },
            body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
        });

    it('tells the player their entry, and nobody else', async () => {
        const mine = await call('GET', '/me', codes.alice);

        expect(mine.headers.get('cache-control')).toBe('no-store');
        expect(await mine.json()).toMatchObject({ known: true, name: 'Alice', totals: { games: 1, wins: 1 } });
        expect(await (await call('GET', '/me', 'a-code-nobody-has-0123')).json()).toEqual({ known: false });
        expect((await call('GET', '/me')).status).toBe(401);
        expect((await call('GET', '/me', 'short')).status).toBe(401);
    });

    it('keeps the player out of the lists', async () => {
        expect((await call('POST', '/me', codes.bob, { public: false })).status).toBe(200);

        const games = await (await call('GET', '/games')).json();

        expect(games.games[0].players.map(({ name }) => name)).toEqual(['Alice', anonymous, 'Carl']);
        expect((await call('POST', '/me', codes.bob, { public: 'no' })).status).toBe(400);
        expect((await call('POST', '/me', codes.bob, '{not json')).status).toBe(400);
        expect((await call('POST', '/me', null, { public: true })).status).toBe(401);
    });

    it('rotates the code', async () => {
        const fresh = 'alice-new-code-0123456789';

        expect((await call('POST', '/me/rotate', codes.alice, { code: 'x' })).status).toBe(400);
        expect((await call('POST', '/me/rotate', codes.alice, { code: codes.bob })).status).toBe(409);
        expect((await call('POST', '/me/rotate', 'unknown-code-0123456789', { code: fresh })).status).toBe(404);
        expect((await call('POST', '/me/rotate', codes.alice, { code: fresh })).status).toBe(200);
        expect(await (await call('GET', '/me', fresh)).json()).toMatchObject({ known: true, name: 'Alice' });
        expect(await (await call('GET', '/me', codes.alice)).json()).toEqual({ known: false });
    });

    it('forgets the player', async () => {
        expect(await (await call('DELETE', '/me', codes.carl)).json()).toEqual({ success: true });
        expect(await (await call('DELETE', '/me', codes.carl)).json()).toEqual({ success: false });
        expect((await call('DELETE', '/me')).status).toBe(401);
    });

    it('does not let in a body that is too large', async () => {
        expect((await call('POST', '/me', codes.bob, { public: true, junk: 'x'.repeat(5000) })).status).toBe(400);
    });
});
