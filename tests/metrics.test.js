import { afterEach, describe, expect, it } from 'vitest';
import { Counter, Gauge, Histogram, Metrics } from '../src/server/service/Metrics.ts';
import { Server } from '../src/server/core/Server.ts';
import { TestClient } from './helpers/TestClient.ts';
import { metrics } from '../src/server/service/Metrics.ts';
import { createGame } from './helpers/game.js';

describe('prometheus text format', () => {
    it('renders a counter per label set', () => {
        const counter = new Counter('things_total', 'Things');

        counter.inc({ kind: 'a' });
        counter.inc({ kind: 'a' }, 2);
        counter.inc({ kind: 'b' });

        expect(counter.render()).toBe(
            '# HELP things_total Things\n# TYPE things_total counter\nthings_total{kind="a"} 3\nthings_total{kind="b"} 1'
        );
    });

    it('sorts the labels and escapes their values', () => {
        const counter = new Counter('things_total', 'Things');

        counter.inc({ b: '1', a: 'say "hi"\\\n' });

        expect(counter.lines()).toEqual(['things_total{a="say \\"hi\\"\\\\\\n",b="1"} 1']);
    });

    it('renders a gauge, and forgets the old values on clear', () => {
        const gauge = new Gauge('level', 'Level');

        gauge.set(3);
        expect(gauge.lines()).toEqual(['level 3']);

        gauge.clear();
        expect(gauge.lines()).toEqual([]);
    });

    it('renders a histogram with cumulative buckets', () => {
        const histogram = new Histogram('duration_seconds', 'Duration', [1, 0.1, 0.5]);

        histogram.observe(0.05);
        histogram.observe(0.3);
        histogram.observe(5);

        expect(histogram.lines()).toEqual([
            'duration_seconds_bucket{le="0.1"} 1',
            'duration_seconds_bucket{le="0.5"} 2',
            'duration_seconds_bucket{le="1"} 2',
            'duration_seconds_bucket{le="+Inf"} 3',
            `duration_seconds_sum ${0.05 + 0.3 + 5}`,
            'duration_seconds_count 3'
        ]);
    });

    it('refreshes the gauges with the collectors, and the process metrics', () => {
        const metrics = new Metrics();

        metrics.addCollector(() => metrics.rooms.set(4));

        const text = metrics.render();

        expect(text).toContain('curvytron_rooms 4');
        expect(text).toContain('curvytron_process_uptime_seconds');
        expect(text).toContain('# TYPE curvytron_tick_duration_seconds histogram');
        expect(text.endsWith('\n')).toBe(true);
    });
});

describe('metrics endpoint', () => {
    const servers = [];
    const clients = [];

    async function start(config = {}) {
        const server = new Server({ port: 0, publicDirectory: 'dist', ...config });

        await server.listen();
        servers.push(server);

        return { server, url: `http://localhost:${server.server.address().port}/metrics` };
    }

    afterEach(() => {
        clients.splice(0).forEach((client) => client.close());
        servers.splice(0).forEach((server) => server.close());
    });

    it('describes the clients and the rooms', async () => {
        const { server, url } = await start();
        const client = await TestClient.connect(server.server.address().port);

        clients.push(client);
        await client.request('room:create', { name: 'metrics' });

        const response = await fetch(url);
        const text = await response.text();

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('text/plain');
        expect(text).toMatch(/^curvytron_clients 1$/m);
        expect(text).toMatch(/^curvytron_rooms 1$/m);
        expect(text).toMatch(/^curvytron_games 0$/m);
        expect(text).toMatch(/^curvytron_connections_total \d+$/m);
    });

    it('can be protected with a token', async () => {
        const { url } = await start({ metrics: { token: 'secret' } });

        expect((await fetch(url)).status).toBe(401);
        expect((await fetch(url, { headers: { Authorization: 'Bearer wrong' } })).status).toBe(401);
        expect((await fetch(url, { headers: { Authorization: 'Bearer secret' } })).status).toBe(200);
    });

    it('can be disabled', async () => {
        const { url } = await start({ metrics: { enabled: false } });

        // Falls through to the static files, where there is no such file
        expect((await fetch(url)).status).toBe(404);
    });
});

describe('game metrics', () => {
    it('measures the frames of a game', () => {
        const { game } = createGame();
        const frames = metrics.tickDuration.count;
        const intervals = metrics.tickInterval.sum;

        game.onFrame(20);

        expect(metrics.tickDuration.count).toBe(frames + 1);
        expect(metrics.tickInterval.sum).toBeCloseTo(intervals + 0.02);
    });

    it('counts the games and the rounds', () => {
        const games = metrics.games.lines().length ? Number(metrics.games.lines()[0].split(' ')[1]) : 0;
        const { game } = createGame();

        game.newRound();

        expect(Number(metrics.games.lines()[0].split(' ')[1])).toBe(games + 1);
        expect(metrics.rounds.lines()[0]).toMatch(/^curvytron_rounds_total \d+$/);
    });
});
