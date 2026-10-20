import { InfluxDB } from 'influx';
import { md5 } from '../service/hash.ts';
import { ClientTracker } from '../trackers/TrackerClient.ts';
import { GameTracker } from '../trackers/TrackerGame.ts';
import { RoomTracker } from '../trackers/TrackerRoom.ts';
import { Collection } from '../../shared/Collection.ts';
import type { SocketClient } from './SocketClient.ts';

/**
 * Inspector
 */
export class Inspector {
    server: any;
    lastUsage: any;
    client: any;
    trackers: any;
    logInterval: any;

    DEPLOY: string = 'deploy';

    CLIENT: string = 'client';

    CLIENTS: string = 'client.total';

    CLIENT_PLAYER: string = 'client.player';

    CLIENT_GAME_PLAYER: string = 'client.game.player';

    CLIENT_LATENCY: string = 'client.latency';

    ROOM: string = 'room';

    ROOMS: string = 'room.total';

    GAME: string = 'game';

    GAME_FPS: string = 'game.fps';

    USAGE_MEMORY: string = 'usage.memory';

    USAGE_CPU: string = 'usage.cpu';

    /**
     * Usage log frequency
     */
    logFrequency: number = 1000;

    constructor(server: any, config: any, packageInfo: any) {
        this.server = server;
        this.lastUsage = { cpu: process.cpuUsage(), time: process.hrtime.bigint() };
        this.client = new InfluxDB({
            host: config.host,
            username: config.username,
            password: config.password,
            database: config.database
        });

        console.info('Inspector activated on %s', config.host);

        this.trackers = {
            client: new Collection(),
            room: new Collection(),
            game: new Collection()
        };

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

        this.writePoint(this.DEPLOY, { version: packageInfo.version }, {});
        this.writePoint(this.CLIENTS, this.server.clients.count(), {});
        this.writePoint(this.ROOMS, this.server.roomRepository.rooms.count(), {});

        this.logInterval = setInterval(this.onLog, this.logFrequency);
    }

    /**
     * On client open
     */
    onClientOpen(client: SocketClient) {
        const tracker = new ClientTracker(this, client);

        this.trackers.client.add(tracker);

        tracker.on('latency', this.onClientLatency);
        client.on('close', this.onClientClose);

        this.writePoint(this.CLIENTS, this.server.clients.count(), {});
    }

    /**
     * On client close
     */
    onClientClose(client: SocketClient) {
        const tracker = this.trackers.client.getById(client.id);

        this.writePoint(this.CLIENTS, this.server.clients.count(), {});

        if (tracker) {
            client.off('close', this.onClientClose);
            tracker.off('latency', this.onClientLatency);
            this.writePoint(this.CLIENT, tracker.getValues(), tracker.getTags());
            this.trackers.client.remove(tracker.destroy());
        }
    }

    /**
     * On client latency
     */
    onClientLatency(data: any) {
        this.writePoint(this.CLIENT_LATENCY, data.latency, { game: data.tracker.uniqId });
    }

    /**
     * On room open
     */
    onRoomOpen(data: any) {
        const room = data.room;

        this.trackers.room.add(new RoomTracker(this, room));

        this.writePoint(this.ROOMS, this.server.roomRepository.rooms.count(), {});

        room.on('game:new', this.onGameNew);
    }

    /**
     * On room open
     */
    onRoomClose(data: any) {
        const room = data.room,
            tracker = this.trackers.room.getById(room.name);

        room.off('game:new', this.onGameNew);

        this.writePoint(this.ROOMS, this.server.roomRepository.rooms.count(), {});

        if (tracker) {
            this.writePoint(this.ROOM, tracker.getValues(), tracker.getTags());
            this.trackers.room.remove(tracker.destroy());
        }
    }

    /**
     * On game add
     */
    onGameNew(data: any) {
        const game = data.game;
        const tracker = new GameTracker(this, game);
        let avatar;
        let client;
        let clientTracker;

        this.trackers.game.add(tracker);

        for (let i = game.avatars.items.length - 1; i >= 0; i--) {
            avatar = game.avatars.items[i];
            client = avatar.player.client;
            clientTracker = this.trackers.client.getById(client.id);

            if (clientTracker) {
                this.writePoint(
                    this.CLIENT_GAME_PLAYER,
                    {
                        color: avatar.color,
                        player: md5(avatar.name),
                        game: tracker.uniqId,
                        client: clientTracker.uniqId
                    },
                    {
                        player: md5(avatar.name),
                        game: tracker.uniqId,
                        client: clientTracker.uniqId
                    }
                );
            }
        }

        tracker.on('fps', this.onGameFPS);
        game.on('end', this.onGameEnd);
    }

    /**
     * On game end
     */
    onGameEnd(data: any) {
        const game = data.game,
            tracker = this.trackers.game.getById(game.name);

        game.off('end', this.onGameEnd);

        if (tracker) {
            tracker.off('fps', this.onGameFPS);
            this.collectGameTrackerData(tracker);
        }
    }

    /**
     * On game FPS
     */
    onGameFPS(data: any) {
        this.writePoint(this.GAME_FPS, data.fps, { game: data.tracker.uniqId });
    }

    /**
     * Collect data from the given tracker
     */
    collectGameTrackerData(tracker: GameTracker) {
        this.writePoint(this.GAME, tracker.getValues(), tracker.getTags());
        this.trackers.game.remove(tracker.destroy());
    }

    /**
     * Write a point
     *
     * @param values A single value or a map of fields
     */
    writePoint(measurement: string, values?: number | any, tags: any = {}) {
        const fields = typeof values === 'object' ? values : { value: values };

        this.client
            .writePoints([{ measurement, tags: this.stringify(tags), fields }])
            .catch((error: Error) => console.error('Inspector write error:', error.message));
    }

    /**
     * Influx tags are strings
     */
    stringify(tags: any) {
        return Object.fromEntries(Object.entries(tags).map(([key, value]) => [key, String(value)]));
    }

    /**
     * On every frame
     */
    onLog() {
        const now = process.hrtime.bigint(),
            cpu = process.cpuUsage(),
            elapsed = Number(now - this.lastUsage.time) / 1000,
            used = cpu.user + cpu.system - this.lastUsage.cpu.user - this.lastUsage.cpu.system;

        this.lastUsage = { cpu: process.cpuUsage(), time: now };

        this.writePoint(this.USAGE_CPU, elapsed > 0 ? (used / elapsed) * 100 : 0);
        this.writePoint(this.USAGE_MEMORY, process.memoryUsage().rss);
    }
}
