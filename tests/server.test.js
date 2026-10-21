import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server } from '../src/server/core/Server.ts';
import { TestClient } from './helpers/TestClient.ts';

let server;
let port;
const clients = [];

async function connect() {
    const client = await TestClient.connect(port);

    clients.push(client);

    return client;
}

beforeAll(async () => {
    server = new Server({ port: 0, publicDirectory: 'dist' });
    await server.listen();
    port = server.server.address().port;
});

afterAll(() => {
    clients.forEach((client) => client.close());
    server.close();
});

describe('socket protocol', () => {
    it('identifies clients', async () => {
        const client = await connect();

        expect(await client.request('whoami')).toEqual(expect.any(Number));
    });

    it('creates, lists and joins rooms', async () => {
        const client = await connect();

        expect(await client.request('room:create', { name: 'alpha' })).toMatchObject({ success: true });
        expect(await client.request('room:create', { name: 'alpha' })).toMatchObject({ success: false });

        const other = await connect();
        const listing = other.waitFor('room:open');

        other.send('room:fetch');

        expect(await listing).toMatchObject({ name: 'alpha' });
        expect(await client.request('room:join', { name: 'alpha', password: null })).toMatchObject({ success: true });
        expect(await client.request('room:join', { name: 'nope', password: null })).toMatchObject({ success: false });
    });

    it('adds players and starts the game once everybody is ready', async () => {
        const first = await connect();
        const second = await connect();

        await first.request('room:create', { name: 'beta' });

        for (const client of [first, second]) {
            expect(await client.request('room:join', { name: 'beta', password: null })).toMatchObject({
                success: true
            });
        }

        const alice = first.waitFor('room:join', ({ player }) => player.name === 'Alice');

        expect(await first.request('player:add', { name: 'Alice', color: '#ff0000' })).toEqual({ success: true });

        const aliceData = await alice;

        expect(aliceData.player).toMatchObject({ name: 'Alice', color: '#ff0000' });

        const bob = second.waitFor('room:join', ({ player }) => player.name === 'Bob');

        expect(await second.request('player:add', { name: 'Bob' })).toEqual({ success: true });

        const bobData = await bob;

        expect(await second.request('player:add', { name: '   ' })).toMatchObject({ success: false });

        const launch = first.waitFor('room:game:start');

        expect(await first.request('room:ready', { player: aliceData.player.id })).toMatchObject({ success: true });
        expect(await second.request('room:ready', { player: bobData.player.id })).toMatchObject({ success: true });
        await launch;
    });

    it('runs a game: rounds start and avatars move', async () => {
        const first = await connect();
        const second = await connect();

        await first.request('room:create', { name: 'gamma' });

        const joined = [];

        for (const [client, name] of [
            [first, 'Alice'],
            [second, 'Bob']
        ]) {
            await client.request('room:join', { name: 'gamma', password: null });

            const player = first.waitFor('room:join', (data) => data.player.name === name);

            await client.request('player:add', { name });
            joined.push((await player).player.id);
        }

        const started = [first, second].map((client) => client.waitFor('room:game:start'));

        await first.request('room:ready', { player: joined[0] });
        await second.request('room:ready', { player: joined[1] });
        await Promise.all(started);

        const rounds = [first, second].map((client) => client.waitFor('round:new'));
        const positions = first.waitFor('position', () => true, 10000);

        first.send('ready');
        second.send('ready');

        await Promise.all(rounds);
        expect(await positions).toEqual([expect.any(Number), expect.any(Number), expect.any(Number)]);
    }, 15000);
});

describe('health', () => {
    it('answers with what is going on', async () => {
        const response = await fetch(`http://localhost:${port}/health`);
        const status = await response.json();

        expect(response.status).toBe(200);
        expect(status).toMatchObject({
            status: 'ok',
            uptime: expect.any(Number),
            clients: expect.any(Number),
            rooms: expect.any(Number),
            games: expect.any(Number),
            players: expect.any(Number),
            avatars: expect.any(Number)
        });
    });
});
