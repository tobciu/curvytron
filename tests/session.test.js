import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Server } from '../src/server/core/Server.ts';
import { TestClient } from './helpers/TestClient.ts';

let server;
let port;
let clients;

async function connect(session) {
    const client = await TestClient.connect(port, session);

    clients.push(client);

    return client;
}

const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

/** Create a room, with a client and a player for every name; the first client is the master */
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

/** Everybody ready: the game loads, and every client says it has loaded it */
async function play(players, ids) {
    const started = players.map(({ client }) => client.waitFor('room:game:start'));

    for (const [index, { client }] of players.entries()) {
        await client.request('room:ready', { player: ids[index] });
    }

    await Promise.all(started);

    const running = players[0].client.waitFor('round:new');

    for (const { client } of players) {
        client.send('ready');
    }

    await running;
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

describe('a client that comes back', () => {
    const carl = { token: 'carl-token-0001', tab: 'carl-tab-0001' };

    async function threePlayers(name, config) {
        const players = [
            { client: await connect(), player: 'Alice' },
            { client: await connect(), player: 'Bob' },
            { client: await connect(carl), player: 'Carl' }
        ];
        const ids = await createRoom(name, players, config);

        return { players, ids };
    }

    it('keeps its player in the game while the connection is down, and takes its place again', async () => {
        const { players, ids } = await threePlayers('drop', { maxScore: 50 });

        await play(players, ids);

        const [alice, , dropped] = players.map(({ client }) => client);
        const id = await dropped.request('whoami');
        const away = alice.waitFor('player:connection', (data) => data.player === ids[2] && !data.online);

        dropped.close();

        await away;

        const room = server.roomRepository.get('drop');

        expect(room.players.count()).toBe(3);
        expect(room.players.getById(ids[2]).client.away).toBe(true);

        // Another tab of the browser, or a reload: same token
        const back = await connect({ ...carl, tab: 'carl-tab-0002' });

        expect(await back.request('whoami')).toBe(id);

        const online = alice.waitFor('player:connection', (data) => data.player === ids[2] && data.online);
        const start = back.waitFor('room:game:start');
        const joined = await back.request('room:join', { name: 'drop', password: null });

        expect(joined).toMatchObject({ success: true });
        expect(joined.room.players.find((player) => player.id === ids[2])).toMatchObject({ online: false });
        await start;

        // The page of the game has loaded: the player is not away any more, and watches the round
        const spectate = back.waitFor('spectate');

        back.send('ready');
        await online;

        expect((await spectate).away).toEqual([]);

        // The connection was down for a part of a round only, nobody sat out: it plays the next round
        await back.waitFor('round:new', () => true, 40000);

        const avatar = room.game.avatars.getById(ids[2]);

        expect(avatar.present).toBe(true);
        expect(avatar.alive).toBe(true);
    }, 60000);

    it('sits out the round that follows the lost connection, and is back for the one after', async () => {
        const { players, ids } = await threePlayers('sitout', { maxScore: 50 });

        await play(players, ids);

        const [alice, , dropped] = players.map(({ client }) => client);
        const left = alice.waitFor('game:leave', (avatar) => avatar === ids[2], 40000);

        dropped.close();

        await left;

        const back = await connect(carl);
        const joined = back.waitFor('game:join', (avatar) => avatar === ids[2], 40000);

        await back.request('room:join', { name: 'sitout', password: null });
        back.send('ready');

        await joined;
    }, 80000);

    it('is let go when the game is over', async () => {
        const { players, ids } = await threePlayers('over', { maxScore: 1 });

        await play(players, ids);

        const [alice, bob, dropped] = players.map(({ client }) => client);
        const end = [alice, bob].map((client) => client.waitFor('end', () => true, 40000));

        dropped.close();

        await Promise.all(end);
        await sleep(100);

        const room = server.roomRepository.get('over');

        expect(room.players.count()).toBe(2);
        expect(server.clients.items.some((client) => client.token === carl.token)).toBe(false);

        // Nothing to come back to
        const back = await connect(carl);

        expect(await back.request('whoami')).not.toBe(await alice.request('whoami'));
    }, 80000);

    it('is not mixed up with another tab of the same browser', async () => {
        const first = await connect({ token: 'browser-token-01', tab: 'tab-number-0001' });
        const second = await connect({ token: 'browser-token-01', tab: 'tab-number-0002' });

        expect(await first.request('whoami')).not.toBe(await second.request('whoami'));

        // A reload of the first tab: the server did not see the old connection close yet
        const id = await first.request('whoami');
        const reloaded = await connect({ token: 'browser-token-01', tab: 'tab-number-0001' });

        expect(await reloaded.request('whoami')).toBe(id);
    });
});

describe('a player that comes in the middle of a game', () => {
    it('watches, then takes part from the next round on', async () => {
        const players = [
            { client: await connect(), player: 'Alice' },
            { client: await connect(), player: 'Bob' }
        ];
        const ids = await createRoom('late', players, { maxScore: 50 });

        await play(players, ids);

        const late = await connect();
        const joined = players[0].client.waitFor('room:join', (data) => data.player.name === 'Dave');

        await late.request('room:join', { name: 'late', password: null });

        expect(await late.request('player:add', { name: 'Dave' })).toEqual({ success: true });

        const id = (await joined).player.id;
        const spectate = late.waitFor('spectate');

        late.send('ready');

        expect((await spectate).away).toContain(id);
        // Everybody in the room sees the new player take part
        await Promise.all(
            [late, players[0].client].map((client) => client.waitFor('game:join', (avatar) => avatar === id, 40000))
        );
    }, 80000);
});
