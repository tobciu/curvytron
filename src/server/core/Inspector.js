import { InfluxDB } from 'influx';
import { md5 } from '../service/hash.js';
import { ClientTracker } from '../trackers/TrackerClient.js';
import { GameTracker } from '../trackers/TrackerGame.js';
import { RoomTracker } from '../trackers/TrackerRoom.js';
import { Collection } from '../../shared/Collection.js';

/**
 * Inspector
 *
 * @param {Server} server
 * @param {Object} config
 */
export class Inspector {
    constructor(server, config, packageInfo) {
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

        this.writePoint(this.DEPLOY, { version: packageInfo.version }, {}, {});
        this.writePoint(this.CLIENTS, this.server.clients.count(), {}, {});
        this.writePoint(this.ROOMS, this.server.roomRepository.rooms.count(), {}, {});

        this.logInterval = setInterval(this.onLog, this.logFrequency);
    }

    /**
     * On client open
     *
     * @param {SocketClient} client
     */
    onClientOpen(client) {
        const tracker = new ClientTracker(this, client);

        this.trackers.client.add(tracker);

        tracker.on('latency', this.onClientLatency);
        client.on('close', this.onClientClose);

        this.writePoint(this.CLIENTS, this.server.clients.count(), {}, {});
    }

    /**
     * On client close
     *
     * @param {SocketClient} client
     */
    onClientClose(client) {
        const tracker = this.trackers.client.getById(client.id);

        this.writePoint(this.CLIENTS, this.server.clients.count(), {}, {});

        if (tracker) {
            client.off('close', this.onClientClose);
            tracker.off('latency', this.onClientLatency);
            this.writePoint(this.CLIENT, tracker.getValues(), tracker.getTags(), {});
            this.trackers.client.remove(tracker.destroy());
        }
    }

    /**
     * On client latency
     *
     * @param {Object} data
     */
    onClientLatency(data) {
        this.writePoint(this.CLIENT_LATENCY, data.latency, { game: data.tracker.uniqId }, {});
    }

    /**
     * On room open
     *
     * @param {Object} data
     */
    onRoomOpen(data) {
        const room = data.room;

        this.trackers.room.add(new RoomTracker(this, room));

        this.writePoint(this.ROOMS, this.server.roomRepository.rooms.count(), {}, {});

        room.on('game:new', this.onGameNew);
    }

    /**
     * On room open
     *
     * @param {Object} data
     */
    onRoomClose(data) {
        const room = data.room,
            tracker = this.trackers.room.getById(room.name);

        room.off('game:new', this.onGameNew);

        this.writePoint(this.ROOMS, this.server.roomRepository.rooms.count(), {}, {});

        if (tracker) {
            this.writePoint(this.ROOM, tracker.getValues(), tracker.getTags(), {});
            this.trackers.room.remove(tracker.destroy());
        }
    }

    /**
     * On game add
     *
     * @param {Game} game
     */
    onGameNew(data) {
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
                    },
                    {}
                );
            }
        }

        tracker.on('fps', this.onGameFPS);
        game.on('end', this.onGameEnd);
    }

    /**
     * On game end
     *
     * @param {Game} game
     */
    onGameEnd(data) {
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
     *
     * @param {Object} data
     */
    onGameFPS(data) {
        this.writePoint(this.GAME_FPS, data.fps, { game: data.tracker.uniqId }, {});
    }

    /**
     * Collect data from the given tracker
     *
     * @param {GameTracker} tracker
     */
    collectGameTrackerData(tracker) {
        this.writePoint(this.GAME, tracker.getValues(), tracker.getTags(), {});
        this.trackers.game.remove(tracker.destroy());
    }

    /**
     * Write a point
     *
     * @param {String} measurement
     * @param {Number|Object} values A single value or a map of fields
     * @param {Object} tags
     */
    writePoint(measurement, values, tags = {}) {
        const fields = typeof values === 'object' ? values : { value: values };

        this.client
            .writePoints([{ measurement, tags: this.stringify(tags), fields }])
            .catch((error) => console.error('Inspector write error:', error.message));
    }

    /**
     * Influx tags are strings
     *
     * @param {Object} tags
     *
     * @return {Object}
     */
    stringify(tags) {
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

Inspector.prototype.DEPLOY = 'deploy';
Inspector.prototype.CLIENT = 'client';
Inspector.prototype.CLIENTS = 'client.total';
Inspector.prototype.CLIENT_PLAYER = 'client.player';
Inspector.prototype.CLIENT_GAME_PLAYER = 'client.game.player';
Inspector.prototype.CLIENT_LATENCY = 'client.latency';
Inspector.prototype.ROOM = 'room';
Inspector.prototype.ROOMS = 'room.total';
Inspector.prototype.GAME = 'game';
Inspector.prototype.GAME_FPS = 'game.fps';
Inspector.prototype.USAGE_MEMORY = 'usage.memory';
Inspector.prototype.USAGE_CPU = 'usage.cpu';

/**
 * Usage log frequency
 *
 * @type {Number}
 */
Inspector.prototype.logFrequency = 1000;
