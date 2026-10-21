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

        // The handlers check the data: make one fail on purpose
        server.clients.items.at(-1).on('boom', () => {
            throw new Error('boom');
        });
        client.send('boom');
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

describe('validation of the events', () => {
    const invalid = [
        ['room:create', null],
        ['room:create', {}],
        ['room:create', { name: 5 }],
        ['room:create', { name: 'x'.repeat(500) }],
        ['room:join', {}],
        ['room:join', { name: 'a', password: 5 }]
    ];

    it.each(invalid)('answers %s with %j with an error, and not with a crash', async (name, data) => {
        const client = await connect();
        const errors = metrics.eventErrors.values.get('')?.value ?? 0;

        expect(await client.request(name, data)).toEqual({ success: false, error: 'Invalid data.' });
        expect(metrics.eventErrors.values.get('')?.value ?? 0).toBe(errors);
    });

    const inRoom = [
        ['player:add', null],
        ['player:add', { name: 5 }],
        ['player:add', { name: 'x', color: 5 }],
        ['player:add', { name: 'x'.repeat(500) }],
        ['player:remove', { player: 'a' }],
        ['player:remove', { player: -1 }],
        ['room:ready', {}],
        ['room:ready', { player: 1.5 }],
        ['room:name', { player: 1, name: 5 }],
        ['room:color', { player: 1, color: {} }],
        ['player:kick', { player: null }],
        ['room:config:open', { open: 'yes' }],
        ['room:config:max-score', { maxScore: {} }],
        ['room:config:variable', { variable: 5, value: 1 }],
        ['room:config:variable', { variable: 'bonusRate', value: 'x'.repeat(50) }],
        ['room:config:bonus', { bonus: [] }]
    ];

    it.each(inRoom)('answers %s with %j with an error, in a room', async (name, data) => {
        const client = await connect();
        const errors = metrics.eventErrors.values.get('')?.value ?? 0;

        await client.request('room:create', { name: 'valid' });
        await client.request('room:join', { name: 'valid', password: null });
        // The room master is the one who can change the configuration
        await client.request('player:add', { name: 'Master' });

        const answer = await client.request(name, data);

        expect(answer).toMatchObject({ success: false });
        expect(metrics.eventErrors.values.get('')?.value ?? 0).toBe(errors);
    });

    it('ignores wrong steering and wrong activity', async () => {
        const client = await connect();
        const errors = metrics.eventErrors.values.get('')?.value ?? 0;

        for (const data of [null, 5, {}, { avatar: 1, move: 5 }, { avatar: 'a', move: 0 }, { avatar: 1, move: 0.5 }]) {
            client.send('player:move', data);
        }

        client.send('activity', 'yes');
        await client.request('whoami');

        expect(metrics.eventErrors.values.get('')?.value ?? 0).toBe(errors);
        expect(server.clients.items.at(-1).active).toBe(true);
    });
});

describe('limits', () => {
    it('drops the events of a client that sends too many', async () => {
        const client = await connect();
        const dropped = metrics.eventsDropped.values.get('')?.value ?? 0;

        for (let i = 0; i < 400; i++) {
            client.send('whoami');
        }

        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(metrics.eventsDropped.values.get('').value).toBeGreaterThan(dropped + 100);

        // Slow down, and the client is served again
        await new Promise((resolve) => setTimeout(resolve, 1500));
        expect(await client.request('whoami')).toEqual(expect.any(Number));
    });

    it('disconnects a client that goes on', async () => {
        const client = await connect();
        const closed = new Promise((resolve) => client.socket.once('close', (code) => resolve(code)));

        for (let i = 0; i < 2000; i++) {
            client.send('whoami');
        }

        expect(await closed).toBe(1008);
    });

    it('limits the players of a client', async () => {
        const client = await connect();

        await client.request('room:create', { name: 'crowd' });
        await client.request('room:join', { name: 'crowd', password: null });

        const answers = [];

        for (let i = 0; i < 18; i++) {
            answers.push(await client.request('player:add', { name: `P${i}` }));
            // Stay under the limit of the events
            await new Promise((resolve) => setTimeout(resolve, 5));
        }

        expect(answers.filter((answer) => answer.success)).toHaveLength(16);
        expect(answers.at(-1)).toMatchObject({ success: false, error: 'Too many players.' });
    });

    it('limits the rooms', async () => {
        const client = await connect();
        const { RoomRepository } = await import('../src/server/repository/RoomRepository.ts');
        const max = RoomRepository.maxRooms;

        RoomRepository.maxRooms = 2;

        try {
            expect(await client.request('room:create', { name: 'one' })).toMatchObject({ success: true });
            expect(await client.request('room:create', { name: 'two' })).toMatchObject({ success: true });
            expect(await client.request('room:create', { name: 'three' })).toMatchObject({ success: false });
        } finally {
            RoomRepository.maxRooms = max;
        }
    });
});
