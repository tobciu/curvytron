import influx from 'influx';
import Collection from '../../shared/Collection.js';
import ClientTracker from '../trackers/TrackerClient.js';
import RoomTracker from '../trackers/TrackerRoom.js';
import GameTracker from '../trackers/TrackerGame.js';
import md5 from 'MD5';
import usage from 'usage';
import fs from 'fs';
const packageInfo = JSON.parse(fs.readFileSync('package.json', 'utf8'));

/**
 * Inspector
 */
class Inspector {
    DEPLOY = 'deploy';
    CLIENT = 'client';
    CLIENTS = 'client.total';
    CLIENT_PLAYER = 'client.player';
    CLIENT_GAME_PLAYER = 'client.game.player';
    CLIENT_LATENCY = 'client.latency';
    ROOM = 'room';
    ROOMS = 'room.total';
    GAME = 'game';
    GAME_FPS = 'game.fps';
    USAGE_MEMORY = 'usage.memory';
    USAGE_CPU = 'usage.cpu';

    /**
     * Usage log frequency
     *
     * @type {Number}
     */
    logFrequency = 1000;

    constructor(server, config) {
        this.server = server;
        this.client = influx(config);

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
        this.logUsage = this.logUsage.bind(this);

        this.server.on('client', this.onClientOpen);
        this.server.roomRepository.on('room:open', this.onRoomOpen);
        this.server.roomRepository.on('room:close', this.onRoomClose);

        this.client.writePoint(this.DEPLOY, { version: packageInfo.version }, {}, {});
        this.client.writePoint(this.CLIENTS, this.server.clients.count(), {}, {});
        this.client.writePoint(this.ROOMS, this.server.roomRepository.rooms.count(), {}, {});

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

        this.client.writePoint(this.CLIENTS, this.server.clients.count(), {}, {});
    }

    /**
     * On client close
     *
     * @param {SocketClient} client
     */
    onClientClose(client) {
        const tracker = this.trackers.client.getById(client.id);

        this.client.writePoint(this.CLIENTS, this.server.clients.count(), {}, {});

        if (tracker) {
            client.removeListener('close', this.onClientClose);
            tracker.removeListener('latency', this.onClientLatency);
            this.client.writePoint(this.CLIENT, tracker.getValues(), tracker.getTags(), {});
            this.trackers.client.remove(tracker.destroy());
        }
    }

    /**
     * On client latency
     *
     * @param {Object} data
     */
    onClientLatency(data) {
        this.client.writePoint(this.CLIENT_LATENCY, data.latency, { game: data.tracker.uniqId }, {});
    }

    /**
     * On room open
     *
     * @param {Object} data
     */
    onRoomOpen(data) {
        const room = data.room;
        this.trackers.room.add(new RoomTracker(this, room));
        this.client.writePoint(this.ROOMS, this.server.roomRepository.rooms.count(), {}, {});
        room.on('game:new', this.onGameNew);
    }

    /**
     * On room open
     *
     * @param {Object} data
     */
    onRoomClose(data) {
        const room = data.room;
        const tracker = this.trackers.room.getById(room.name);

        room.removeListener('game:new', this.onGameNew);

        this.client.writePoint(this.ROOMS, this.server.roomRepository.rooms.count(), {}, {});

        if (tracker) {
            this.client.writePoint(this.ROOM, tracker.getValues(), tracker.getTags(), {});
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

        this.trackers.game.add(tracker);

        for (let i = game.avatars.items.length - 1; i >= 0; i--) {
            const avatar = game.avatars.items[i];
            const client = avatar.player.client;
            const clientTracker = this.trackers.client.getById(client.id);

            if (clientTracker) {
                this.client.writePoint(
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
        const game = data.game;
        const tracker = this.trackers.game.getById(game.name);

        game.removeListener('end', this.onGameEnd);

        if (tracker) {
            tracker.removeListener('fps', this.onGameFPS);
            this.collectGameTrackerData(tracker);
        }
    }

    /**
     * On game FPS
     *
     * @param {Object} data
     */
    onGameFPS(data) {
        this.client.writePoint(this.GAME_FPS, data.fps, { game: data.tracker.uniqId }, {});
    }

    /**
     * Collect data from the given tracker
     *
     * @param {GameTracker} tracker
     */
    collectGameTrackerData(tracker) {
        this.client.writePoint(this.GAME, tracker.getValues(), tracker.getTags(), {});
        this.trackers.game.remove(tracker.destroy());
    }

    /**
     * On every frame
     */
    onLog() {
        usage.lookup(process.pid, this.logUsage);
    }

    /**
     * Log usage
     */
    logUsage(err, result) {
        if (result) {
            this.client.writePoint(this.USAGE_CPU, result.cpu, {}, {});
            this.client.writePoint(this.USAGE_MEMORY, result.memory, {}, {});
        }
    }
}

export default Inspector;
