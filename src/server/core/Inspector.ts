import { readFileSync } from 'node:fs';
import { Collection } from '@shared/Collection.ts';
import { toLineProtocol } from './influxLineProtocol.ts';
import { md5 } from '../trackers/md5.ts';
import { TrackerClient } from '../trackers/TrackerClient.ts';
import { TrackerGame } from '../trackers/TrackerGame.ts';
import { TrackerRoom } from '../trackers/TrackerRoom.ts';
import type { Server } from './Server.ts';
import type { SocketClient } from './SocketClient.ts';
import type { Room } from '../model/Room.ts';
import type { Game } from '../model/Game.ts';

export interface InspectorConfig {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  database: string;
}

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Optional metrics reporter: writes counters/gauges to an InfluxDB 1.x HTTP
 * write endpoint (line protocol). Config-gated off by default
 * (`inspector.enabled`). Writes are fire-and-forget — a write failure is
 * logged once and otherwise ignored; metrics must never affect gameplay.
 */
export class Inspector {
  static readonly DEPLOY = 'deploy';
  static readonly CLIENT = 'client';
  static readonly CLIENTS = 'client.total';
  static readonly CLIENT_GAME_PLAYER = 'client.game.player';
  static readonly CLIENT_LATENCY = 'client.latency';
  static readonly ROOM = 'room';
  static readonly ROOMS = 'room.total';
  static readonly GAME = 'game';
  static readonly GAME_FPS = 'game.fps';
  static readonly USAGE_MEMORY = 'usage.memory';
  static readonly USAGE_CPU = 'usage.cpu';

  /** Usage-sample log frequency (ms). */
  static readonly logFrequency = 1000;

  readonly trackers = {
    client: new Collection<TrackerClient>(),
    room: new Collection<TrackerRoom>(),
    game: new Collection<TrackerGame>(),
  };

  private readonly server: Server;
  private readonly writeUrl: URL;
  private readonly logInterval: ReturnType<typeof setInterval>;
  private warnedOnce = false;
  private lastCpu = process.cpuUsage();
  private lastCpuTime = process.hrtime.bigint();

  constructor(server: Server, config: InspectorConfig) {
    this.server = server;

    const url = new URL(`http://${config.host}:${config.port ?? 8086}/write`);
    url.searchParams.set('db', config.database);
    if (config.username) {
      url.searchParams.set('u', config.username);
    }
    if (config.password) {
      url.searchParams.set('p', config.password);
    }
    this.writeUrl = url;

    console.info('Inspector activated on %s', config.host);

    this.onClientOpen = this.onClientOpen.bind(this);
    this.onClientClose = this.onClientClose.bind(this);
    this.onClientLatency = this.onClientLatency.bind(this);
    this.onRoomOpen = this.onRoomOpen.bind(this);
    this.onRoomClose = this.onRoomClose.bind(this);
    this.onGameNew = this.onGameNew.bind(this);
    this.onGameEnd = this.onGameEnd.bind(this);
    this.onGameFPS = this.onGameFPS.bind(this);
    this.onLog = this.onLog.bind(this);

    this.server.on('client', this.onClientOpen);
    this.server.roomRepository.on('room:open', this.onRoomOpen);
    this.server.roomRepository.on('room:close', this.onRoomClose);

    this.write(Inspector.DEPLOY, { version: readPackageVersion() });
    this.write(Inspector.CLIENTS, this.server.clients.count());
    this.write(Inspector.ROOMS, this.server.roomRepository.rooms.count());

    this.logInterval = setInterval(this.onLog, Inspector.logFrequency);
  }

  onClientOpen(client: SocketClient): void {
    const tracker = new TrackerClient(client);
    this.trackers.client.add(tracker);

    tracker.on('latency', this.onClientLatency);
    client.on('close', this.onClientClose);

    this.write(Inspector.CLIENTS, this.server.clients.count());
  }

  onClientClose(client: SocketClient): void {
    const tracker = this.trackers.client.getById(String(client.id));

    this.write(Inspector.CLIENTS, this.server.clients.count());

    if (tracker) {
      client.removeListener('close', this.onClientClose);
      tracker.removeListener('latency', this.onClientLatency);
      this.write(Inspector.CLIENT, tracker.getValues(), tracker.getTags());
      this.trackers.client.remove(tracker.destroy());
    }
  }

  onClientLatency(data: { tracker: TrackerClient; latency: number }): void {
    this.write(Inspector.CLIENT_LATENCY, data.latency, { game: data.tracker.uniqId });
  }

  onRoomOpen(data: { room: Room }): void {
    const room = data.room;
    this.trackers.room.add(new TrackerRoom(room));
    this.write(Inspector.ROOMS, this.server.roomRepository.rooms.count());
    room.on('game:new', this.onGameNew);
  }

  onRoomClose(data: { room: Room }): void {
    const room = data.room;
    const tracker = this.trackers.room.getById(room.name);

    room.removeListener('game:new', this.onGameNew);
    this.write(Inspector.ROOMS, this.server.roomRepository.rooms.count());

    if (tracker) {
      this.write(Inspector.ROOM, tracker.getValues(), tracker.getTags());
      this.trackers.room.remove(tracker.destroy());
    }
  }

  onGameNew(data: { room: Room; game: Game }): void {
    const game = data.game;
    const tracker = new TrackerGame(game);
    this.trackers.game.add(tracker);

    for (let i = game.avatars.items.length - 1; i >= 0; i--) {
      const avatar = game.avatars.items[i];
      // `BaseAvatar.player` is typed narrowly (id/name/color); the server Player has `.client` too.
      const clientId = (avatar.player as any).client.id as string | number;
      const clientTracker = this.trackers.client.getById(String(clientId));

      if (clientTracker) {
        const tags = {
          player: md5(avatar.name),
          game: tracker.uniqId,
          client: clientTracker.uniqId,
        };
        this.write(Inspector.CLIENT_GAME_PLAYER, { color: avatar.color, ...tags }, tags);
      }
    }

    tracker.on('fps', this.onGameFPS);
    game.on('end', this.onGameEnd);
  }

  onGameEnd(data: { game: Game }): void {
    const game = data.game;
    const tracker = this.trackers.game.getById(game.name);
    game.removeListener('end', this.onGameEnd);

    if (tracker) {
      tracker.removeListener('fps', this.onGameFPS);
      this.collectGameTrackerData(tracker);
    }
  }

  onGameFPS(data: { tracker: TrackerGame; fps: number }): void {
    this.write(Inspector.GAME_FPS, data.fps, { game: data.tracker.uniqId });
  }

  collectGameTrackerData(tracker: TrackerGame): void {
    this.write(Inspector.GAME, tracker.getValues(), tracker.getTags());
    this.trackers.game.remove(tracker.destroy());
  }

  onLog(): void {
    const { cpu, memory } = this.sampleUsage();
    this.write(Inspector.USAGE_CPU, cpu);
    this.write(Inspector.USAGE_MEMORY, memory);
  }

  /** CPU % over the last sample window + resident memory (bytes) — no `usage` native dependency needed. */
  private sampleUsage(): { cpu: number; memory: number } {
    const cpu = process.cpuUsage(this.lastCpu);
    const now = process.hrtime.bigint();
    const elapsedMs = Number(now - this.lastCpuTime) / 1e6;

    this.lastCpu = process.cpuUsage();
    this.lastCpuTime = now;

    const cpuMs = (cpu.user + cpu.system) / 1000;

    return {
      cpu: elapsedMs > 0 ? (cpuMs / elapsedMs) * 100 : 0,
      memory: process.memoryUsage().rss,
    };
  }

  private write(
    measurement: string,
    values: number | Record<string, unknown>,
    tags: Record<string, string> = {},
  ): void {
    const fields = typeof values === 'object' ? values : { value: values };
    const line = toLineProtocol(measurement, tags, fields);

    fetch(this.writeUrl, { method: 'POST', body: line }).catch((error: unknown) => {
      if (!this.warnedOnce) {
        this.warnedOnce = true;
        console.error('Inspector: failed to write to InfluxDB (further errors suppressed):', error);
      }
    });
  }

  destroy(): void {
    clearInterval(this.logInterval);
  }
}
