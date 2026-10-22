/**
 * Metrics in the Prometheus text format
 *
 * Small on purpose: counters, gauges and histograms with labels are all the game needs, so there is no dependency.
 * The gauges that describe the current state are computed when the metrics are scraped (see `Metrics.collectors`).
 */

type Labels = Record<string, string>;

/** Escape a label value as the text format requires: JSON escapes exactly the characters Prometheus does */
function escapeLabel(value: string): string {
    return JSON.stringify(value).slice(1, -1);
}

/** `{a="1",b="2"}` or nothing, in a stable order */
function formatLabels(labels: Labels): string {
    const keys = Object.keys(labels).sort((a, b) => a.localeCompare(b));

    if (!keys.length) {
        return '';
    }

    const pairs = keys.map((key) => `${key}="${escapeLabel(labels[key])}"`);

    return `{${pairs.join(',')}}`;
}

function formatNumber(value: number): string {
    if (Number.isFinite(value)) {
        return String(value);
    }

    return value > 0 ? '+Inf' : '-Inf';
}

abstract class Metric {
    name: string;
    help: string;

    constructor(name: string, help: string) {
        this.name = name;
        this.help = help;
    }

    abstract get type(): string;

    abstract lines(): string[];

    render(): string {
        return [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} ${this.type}`, ...this.lines()].join('\n');
    }
}

/** Value that only goes up */
export class Counter extends Metric {
    values: Map<string, { labels: Labels; value: number }> = new Map();

    get type() {
        return 'counter';
    }

    inc(labels: Labels = {}, amount: number = 1) {
        const key = formatLabels(labels);
        const entry = this.values.get(key) ?? { labels, value: 0 };

        entry.value += amount;
        this.values.set(key, entry);
    }

    lines() {
        return [...this.values.entries()].map(([key, entry]) => `${this.name}${key} ${formatNumber(entry.value)}`);
    }
}

/** Value that is set when the metrics are collected */
export class Gauge extends Metric {
    values: Map<string, number> = new Map();

    get type() {
        return 'gauge';
    }

    set(value: number, labels: Labels = {}) {
        this.values.set(formatLabels(labels), value);
    }

    clear() {
        this.values.clear();
    }

    lines() {
        return [...this.values.entries()].map(([key, value]) => `${this.name}${key} ${formatNumber(value)}`);
    }
}

/** Distribution of values in buckets: Grafana computes the percentiles with `histogram_quantile` */
export class Histogram extends Metric {
    buckets: number[];
    counts: number[];
    sum: number = 0;
    count: number = 0;

    constructor(name: string, help: string, buckets: number[]) {
        super(name, help);

        this.buckets = buckets.toSorted((a, b) => a - b);
        this.counts = this.buckets.map(() => 0);
    }

    get type() {
        return 'histogram';
    }

    observe(value: number) {
        this.sum += value;
        this.count++;

        for (let i = 0; i < this.buckets.length; i++) {
            if (value <= this.buckets[i]) {
                this.counts[i]++;
            }
        }
    }

    lines() {
        return [
            ...this.buckets.map((bucket, i) => `${this.name}_bucket{le="${bucket}"} ${this.counts[i]}`),
            `${this.name}_bucket{le="+Inf"} ${this.count}`,
            `${this.name}_sum ${this.sum}`,
            `${this.name}_count ${this.count}`
        ];
    }
}

export class Metrics {
    metrics: Metric[] = [];
    collectors: Array<() => void> = [];

    connections = this.add(new Counter('curvytron_connections_total', 'Clients that connected since the start'));
    games = this.add(new Counter('curvytron_games_total', 'Games started'));
    rounds = this.add(new Counter('curvytron_rounds_total', 'Rounds started'));
    bonuses = this.add(new Counter('curvytron_bonuses_caught_total', 'Bonuses caught by the players'));
    eventErrors = this.add(
        new Counter('curvytron_event_errors_total', 'Events of the clients that made their handler fail')
    );
    gameErrors = this.add(new Counter('curvytron_game_errors_total', 'Games ended because of an error'));
    eventsDropped = this.add(
        new Counter('curvytron_events_dropped_total', 'Events of the clients dropped because they sent too many')
    );
    deaths = this.add(new Counter('curvytron_deaths_total', 'Deaths of the avatars, by cause'));
    gamesSaved = this.add(new Counter('curvytron_storage_games_saved_total', 'Games kept in the database'));
    storageErrors = this.add(
        new Counter('curvytron_storage_errors_total', 'Games that could not be kept in the database')
    );

    clients = this.add(new Gauge('curvytron_clients', 'Connected clients'));
    rooms = this.add(new Gauge('curvytron_rooms', 'Open rooms'));
    activeGames = this.add(new Gauge('curvytron_games', 'Games being played'));
    players = this.add(new Gauge('curvytron_players', 'Players in the rooms'));
    avatars = this.add(new Gauge('curvytron_avatars', 'Avatars in the games being played'));
    memory = this.add(new Gauge('curvytron_process_memory_bytes', 'Memory of the server process'));
    cpu = this.add(new Gauge('curvytron_process_cpu_seconds', 'CPU time used by the server process'));
    uptime = this.add(new Gauge('curvytron_process_uptime_seconds', 'Time since the server started'));

    /** Time taken by the server to compute one frame: it has to stay far below the 16 ms of a frame */
    tickDuration = this.add(
        new Histogram(
            'curvytron_tick_duration_seconds',
            'Time taken to compute a frame of a game',
            [0.0001, 0.00025, 0.0005, 0.001, 0.0025, 0.005, 0.01, 0.016, 0.033]
        )
    );

    /** Time between two frames: more than ~17 ms means that the game loop is late and the players see stutter */
    tickInterval = this.add(
        new Histogram(
            'curvytron_tick_interval_seconds',
            'Time between two frames of a game',
            [0.0167, 0.02, 0.025, 0.033, 0.05, 0.1, 0.25]
        )
    );

    /** Time taken to keep a finished game: it blocks the server while it runs, so it has to stay small */
    storageWrite = this.add(
        new Histogram(
            'curvytron_storage_write_duration_seconds',
            'Time taken to keep a game in the database',
            [0.0005, 0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1]
        )
    );

    latency = this.add(
        new Histogram(
            'curvytron_client_latency_seconds',
            'Round trip time of the pings sent to the clients',
            [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
        )
    );

    constructor() {
        // Counters without labels exist from the start, so that Prometheus sees the first increase
        for (const counter of [
            this.connections,
            this.games,
            this.rounds,
            this.eventErrors,
            this.eventsDropped,
            this.gameErrors,
            this.gamesSaved,
            this.storageErrors
        ]) {
            counter.inc({}, 0);
        }
    }

    add<T extends Metric>(metric: T): T {
        this.metrics.push(metric);

        return metric;
    }

    /**
     * Register a function that refreshes the gauges just before the metrics are read
     */
    addCollector(collector: () => void) {
        this.collectors.push(collector);
    }

    removeCollector(collector: () => void) {
        this.collectors = this.collectors.filter((registered) => registered !== collector);
    }

    /**
     * The metrics in the Prometheus text format
     */
    render(): string {
        this.uptime.set(process.uptime());
        this.memory.set(process.memoryUsage().rss, { type: 'rss' });
        this.memory.set(process.memoryUsage().heapUsed, { type: 'heap_used' });
        this.cpu.set(process.cpuUsage().user / 1e6, { mode: 'user' });
        this.cpu.set(process.cpuUsage().system / 1e6, { mode: 'system' });

        for (const collector of this.collectors) {
            collector();
        }

        return `${this.metrics.map((metric) => metric.render()).join('\n\n')}\n`;
    }
}

/** The metrics of the server: shared by everything that has something to count */
export const metrics = new Metrics();
