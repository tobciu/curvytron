import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { Server } from '../src/server/core/Server.ts';
import { metrics } from '../src/server/service/Metrics.ts';
import { TestClient } from './helpers/TestClient.ts';

let server;
let port;
let clients;

async function connect() {
    const client = await TestClient.connect(port);

    clients.push(client);

    return client;
}

/** Create a room with the given clients in it, each with a player of the given name */
async function createRoom(name, players, config = {}) {
    const [master] = players;

    await master.client.request('room:create', { name });

    const ids = [];

    for (const { client, player } of players) {
        await client.request('room:join', { name, password: null });

        const joined = master.client.waitFor('room:join', (data) => data.player.name === player);

        expect(await client.request('player:add', { name: player })).toEqual({ success: true });
        ids.push((await joined).player.id);
    }

    if (config.maxScore) {
        await master.client.request('room:config:max-score', { maxScore: config.maxScore });
    }

    return ids;
}

async function readyAll(players, ids) {
    const started = players.map(({ client }) => client.waitFor('room:game:start'));

    for (const [index, { client }] of players.entries()) {
        await client.request('room:ready', { player: ids[index] });
    }

    await Promise.all(started);
}

beforeEach(async () => {
    clients = [];
    server = new Server({ port: 0, publicDirectory: 'dist' });
    await server.listen();
    port = server.server.address().port;
});

afterEach(() => {
    clients.forEach((client) => client.close());
    server.close();
});

describe('a whole game over the socket', () => {
    it('is played by three clients until the end, with the statistics', async () => {
        const players = [];

        for (const player of ['Alice', 'Bob', 'Carl']) {
            players.push({ client: await connect(), player });
        }

        const ids = await createRoom('whole', players, { maxScore: 1 });
        const stats = players.map(({ client }) => client.waitFor('game:stats', () => true, 30000));
        const end = players.map(({ client }) => client.waitFor('end', () => true, 30000));

        await readyAll(players, ids);

        for (const { client } of players) {
            client.send('ready');
        }

        // Nobody steers: the avatars end up on a border
        const [first] = await Promise.all(stats);

        await Promise.all(end);

        expect(first.players.map((player) => player.name).toSorted()).toEqual(['Alice', 'Bob', 'Carl']);
        expect(first.players.reduce((total, player) => total + player.roundsWon, 0)).toBeLessThanOrEqual(1);
        expect(first.players.reduce((total, player) => total + player.wallDeaths, 0)).toBeGreaterThan(0);
    }, 40000);

    it('goes on when a client leaves in the middle of it', async () => {
        const players = [];

        for (const player of ['Alice', 'Bob', 'Carl']) {
            players.push({ client: await connect(), player });
        }

        const ids = await createRoom('leaver', players, { maxScore: 1 });
        const end = players.slice(0, 2).map(({ client }) => client.waitFor('end', () => true, 30000));

        await readyAll(players, ids);

        for (const { client } of players) {
            client.send('ready');
        }

        await players[0].client.waitFor('round:new');
        players[2].client.close();

        await Promise.all(end);

        expect(server.roomRepository.get('leaver')).toBeTruthy();
    }, 40000);

    it('lets a spectator watch a running game', async () => {
        const players = [];

        for (const player of ['Alice', 'Bob']) {
            players.push({ client: await connect(), player });
        }

        const ids = await createRoom('watch', players);

        await readyAll(players, ids);

        const running = players[0].client.waitFor('round:new');

        for (const { client } of players) {
            client.send('ready');
        }

        await running;

        const spectator = await connect();
        const spectate = spectator.waitFor('spectate');

        await spectator.request('room:join', { name: 'watch', password: null });
        spectator.send('ready');

        expect(await spectate).toMatchObject({ inRound: expect.any(Boolean), maxScore: expect.any(Number) });
    }, 20000);
});

describe('wrong data from the clients', () => {
    const payloads = [
        'null',
        '1',
        '"text"',
        '[]',
        '[null]',
        '[[]]',
        '[[null]]',
        '[[1]]',
        '[[{}]]',
        '[{"a":1}]',
        '[[1,2]]',
        '[[null,2]]',
        '[["room:create"]]',
        '[["room:create",null,1]]',
        '[["room:create",{"name":5},1]]',
        '[["room:create",{"name":{}},1]]',
        '[["room:create",[],1]]',
        '[["room:join",null,1]]',
        '[["room:join",{"name":null},1]]',
        '[["whoami",null,5]]',
        '[["__proto__"]]',
        '[["constructor",1,2]]',
        '[["toString"]]',
        '[["player:add"]]',
        '[["player:add",null,1]]',
        '[["player:add",{},1]]',
        '[["player:add",{"name":5},1]]',
        '[["player:add",{"name":"x","color":5},1]]',
        '[["player:remove",null,1]]',
        '[["player:kick",null,1]]',
        '[["room:ready",null,1]]',
        '[["room:talk",null,1]]',
        '[["room:talk",5,1]]',
        '[["room:name",null,1]]',
        '[["room:name",{"player":"a","name":5},1]]',
        '[["room:color",null,1]]',
        '[["room:color",{"player":1,"color":{}},1]]',
        '[["room:config:open",null,1]]',
        '[["room:config:max-score",null,1]]',
        '[["room:config:max-score",{"maxScore":"abc"},1]]',
        '[["room:config:variable",null,1]]',
        '[["room:config:variable",{"variable":"bonusRate","value":"abc"},1]]',
        '[["room:config:bonus",null,1]]',
        '[["room:launch"]]',
        '[["room:leave"]]',
        '[["ready"]]',
        '[["player:move",null]]',
        '[["player:move",5]]',
        '[["player:move",[1,2,3]]]',
        '[["activity",null]]',
        '[["room:fetch",1,2]]',
        '[[0,1],[1,2],[2,3]]'
    ];

    /** The server still answers */
    async function expectAlive() {
        const other = await connect();

        expect(await other.request('whoami')).toEqual(expect.any(Number));
        other.close();
    }

    it.each(payloads)('survives %s, outside of a room', async (payload) => {
        const client = await connect();

        client.socket.send(payload);
        await expectAlive();
        expect(await client.request('whoami')).toEqual(expect.any(Number));
    });

    it('survives all of them in a room with a player, and keeps the room working', async () => {
        const alice = await connect();
        const bob = await connect();
        const players = [
            { client: alice, player: 'Alice' },
            { client: bob, player: 'Bob' }
        ];
        const ids = await createRoom('garbage', players);

        // Without the events that are valid without data: leaving the room is what they do
        for (const payload of payloads.filter((payload) => !/room:(leave|launch)/.test(payload))) {
            alice.socket.send(payload);
        }

        // The same client can still use the room
        expect(await alice.request('room:ready', { player: ids[0] })).toMatchObject({ success: true });
        await expectAlive();
        // Some of the payloads are valid: they may have added a player
        expect(server.roomRepository.get('garbage').players.count()).toBeGreaterThanOrEqual(2);
    });

    it('counts the events whose handler failed', async () => {
        const client = await connect();
        const before = metrics.eventErrors.values.get('')?.value ?? 0;

        client.socket.send('[["room:create",null,1]]');
        await client.request('whoami');

        expect(metrics.eventErrors.values.get('').value).toBeGreaterThan(before);
    });

    it('closes the connection of a client that sends an enormous message', async () => {
        const socket = new WebSocket(`ws://localhost:${port}/`, ['websocket']);

        await new Promise((resolve) => socket.once('open', resolve));

        const closed = new Promise((resolve) => socket.once('close', (code) => resolve(code)));

        socket.send(JSON.stringify([['room:talk', 'x'.repeat(200 * 1024)]]));

        expect(await closed).toBe(1009);
        await expectAlive();
    });
});
