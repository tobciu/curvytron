/**
 * Load test: plays games with simulated clients and reports what the server's metrics say.
 *
 *     npm run load-test -- --rooms 2 --players 5 --duration 60
 *     npm run load-test -- --url http://localhost:8080          (an already running server)
 *
 * Without `--url` a server is started on a free port for the test.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { parseArgs } from 'node:util';
import { TestClient } from '../tests/helpers/TestClient.ts';

const { values } = parseArgs({
    options: {
        url: { type: 'string' },
        rooms: { type: 'string', default: '2' },
        players: { type: 'string', default: '5' },
        duration: { type: 'string', default: '60' },
        token: { type: 'string' }
    }
});

const rooms = Number(values.rooms);
const playersPerRoom = Number(values.players);
const duration = Number(values.duration);

/** Start a server of our own, resolve with its address */
async function startServer(): Promise<{ url: string; child: ChildProcess }> {
    const child = spawn(process.execPath, ['src/server/launcher.ts'], {
        env: { ...process.env, PORT: '0' },
        stdio: ['ignore', 'pipe', 'inherit']
    });

    return new Promise((resolve, reject) => {
        child.once('exit', (code) => reject(new Error(`The server exited with ${code}`)));
        child.stdout.on('data', (chunk: Buffer) => {
            const match = /Listening on port (\d+)/.exec(chunk.toString());

            if (match) {
                resolve({ url: `http://localhost:${match[1]}`, child });
            }
        });
    });
}

/** The value of the samples of a metric: `{ 'le="0.01"': 12, ... }` keyed by their labels */
function parseMetrics(text: string): Map<string, number> {
    const samples = new Map<string, number>();

    for (const line of text.split('\n')) {
        const match = /^([a-z_]+(?:\{[^}]*\})?) (\S+)$/.exec(line);

        if (match) {
            samples.set(match[1], Number(match[2]));
        }
    }

    return samples;
}

/** Percentile of a histogram, the upper bound of the bucket in which it is */
function percentile(samples: Map<string, number>, name: string, quantile: number): number {
    const total = samples.get(`${name}_count`) ?? 0;
    const buckets = [...samples.entries()]
        .filter(([key]) => key.startsWith(`${name}_bucket{le="`) && !key.includes('+Inf'))
        .map(([key, count]) => [Number(/le="([^"]+)"/.exec(key)![1]), count] as const)
        .sort((a, b) => a[0] - b[0]);

    if (!total) {
        return Number.NaN;
    }

    return buckets.find(([, count]) => count / total >= quantile)?.[0] ?? Infinity;
}

const ms = (seconds: number) => (Number.isFinite(seconds) ? `${(seconds * 1000).toFixed(1)} ms` : 'n/a');

const server = values.url ? { url: values.url, child: null } : await startServer();
const port = new URL(server.url).port;
const clients: TestClient[] = [];
const timers: ReturnType<typeof setInterval>[] = [];

console.info(`Server ${server.url}: ${rooms} rooms of ${playersPerRoom} players for ${duration} s`);

for (let r = 0; r < rooms; r++) {
    const name = `load${r}-${Date.now() % 100000}`;
    const members: { client: TestClient; id?: number }[] = [];

    for (let p = 0; p < playersPerRoom; p++) {
        const client = await TestClient.connect(port);

        clients.push(client);
        members.push({ client });
        await client.request(p === 0 ? 'room:create' : 'room:join', { name, password: null });

        if (p === 0) {
            await client.request('room:join', { name, password: null });
        }

        const added = members[0].client.waitFor('room:join', (data: any) => data.player.name === `P${r}-${p}`);

        await client.request('player:add', { name: `P${r}-${p}` });
        members[p].id = (await added).player.id;
    }

    // Nobody should win during the test
    await members[0].client.request('room:config:max-score', { maxScore: 1000 });

    const started = members.map(({ client }) => client.waitFor('room:game:start', () => true, 20000));

    for (const { client, id } of members) {
        await client.request('room:ready', { player: id });
    }

    await Promise.all(started);

    for (const { client, id } of members) {
        client.send('ready');
        // Steer at random, like somebody trying not to die
        timers.push(
            setInterval(() => client.send('player:move', { avatar: id, move: Math.floor(Math.random() * 3) - 1 }), 150)
        );
    }
}

await new Promise((resolve) => setTimeout(resolve, duration * 1000));

const response = await fetch(`${server.url}/metrics`, {
    headers: values.token ? { Authorization: `Bearer ${values.token}` } : {}
});
const samples = parseMetrics(await response.text());
const late =
    1 -
    (samples.get('curvytron_tick_interval_seconds_bucket{le="0.033"}') ?? 0) /
        (samples.get('curvytron_tick_interval_seconds_count') ?? 1);

console.info('\nResults');
console.info(
    `  clients ${samples.get('curvytron_clients')}, games ${samples.get('curvytron_games')}, avatars ${samples.get('curvytron_avatars')}`
);
console.info(
    `  frame computation   p50 ${ms(percentile(samples, 'curvytron_tick_duration_seconds', 0.5))}   p99 ${ms(percentile(samples, 'curvytron_tick_duration_seconds', 0.99))}   (a frame lasts 16.7 ms)`
);
console.info(
    `  time between frames p50 ${ms(percentile(samples, 'curvytron_tick_interval_seconds', 0.5))}   p99 ${ms(percentile(samples, 'curvytron_tick_interval_seconds', 0.99))}   frames later than 33 ms: ${(late * 100).toFixed(2)} %`
);
console.info(
    `  client ping         p50 ${ms(percentile(samples, 'curvytron_client_latency_seconds', 0.5))}   p99 ${ms(percentile(samples, 'curvytron_client_latency_seconds', 0.99))}`
);
console.info(
    `  memory ${((samples.get('curvytron_process_memory_bytes{type="rss"}') ?? 0) / 1e6).toFixed(0)} MB, cpu ${samples.get('curvytron_process_cpu_seconds{mode="user"}')} s user / ${samples.get('curvytron_process_cpu_seconds{mode="system"}')} s system`
);
console.info(`  failed events: ${samples.get('curvytron_event_errors_total')}`);

timers.forEach(clearInterval);
clients.forEach((client) => client.close());
server.child?.kill();
process.exit(0);
