import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express, { type Express, type Request, type RequestHandler, type Response } from 'express';
import { WebSocketServer, type WebSocket } from 'ws';
import { EventEmitter } from '#event-emitter';
import { RoomsController } from '../controller/RoomsController.ts';
import { SocketClient } from './SocketClient.ts';
import { RoomRepository } from '../repository/RoomRepository.ts';
import { Collection } from '../../shared/Collection.ts';
import { metrics } from '../service/Metrics.ts';
import type { Room } from '../model/Room.ts';
import type { Storage } from '../storage/Storage.ts';

/**
 * Seconds between two keep-alive pings sent to every connected socket.
 */
const KEEP_ALIVE_INTERVAL = 30000;

/**
 * Largest message accepted from a client, in bytes.
 */
const MAX_PAYLOAD = 64 * 1024;

/** What a browser sends to be recognized: letters, digits, dashes */
const SESSION_ID = /^[\w-]{8,64}$/;

/** A socket that answers the pings (see `keepAlive`) */
type LiveSocket = WebSocket & { isAlive?: boolean };

/** What the server needs to know to start */
export interface ServerConfig {
    /** Port to listen on, 0 for any free port */
    port: number;
    /** Directory of the built client */
    publicDirectory: string;
    /** Extra express middleware (the Vite dev server in development) */
    middleware?: RequestHandler | null;
    /** Version of the game, shown by `/health` */
    version?: string;
    /** The `/metrics` endpoint: `enabled` (default true) and an optional `token` */
    metrics?: { enabled?: boolean; token?: string };
    /** Where the results of the games are kept (none: they are not) */
    storage?: Storage;
}

/**
 * Server
 *
 * @param config.publicDirectory Directory of the built client
 * @param [config.middleware] Extra express middleware (the Vite dev server in development)
 */
export class Server extends EventEmitter {
    config: ServerConfig;
    app: Express;
    server: http.Server;
    sockets: WebSocketServer;
    clients: Collection<SocketClient>;
    roomRepository: RoomRepository;
    roomsController: RoomsController;
    keepAliveLoop: ReturnType<typeof setInterval>;

    constructor(config: ServerConfig) {
        super();

        this.config = config;
        this.app = express();
        this.server = http.createServer(this.app);
        this.sockets = new WebSocketServer({
            noServer: true,
            // Nothing the game sends is large: do not let a client make the server buffer megabytes
            maxPayload: MAX_PAYLOAD,
            handleProtocols: (protocols) => (protocols.has('websocket') ? 'websocket' : false)
        });
        this.clients = new Collection([], 'id', true);

        this.roomRepository = new RoomRepository(config.storage ?? null);
        this.roomsController = new RoomsController(this.roomRepository);

        this.authorizationHandler = this.authorizationHandler.bind(this);
        this.onSocketConnection = this.onSocketConnection.bind(this);
        this.onSocketDisconnection = this.onSocketDisconnection.bind(this);
        this.onError = this.onError.bind(this);
        this.keepAlive = this.keepAlive.bind(this);

        this.collectMetrics = this.collectMetrics.bind(this);
        this.onMetricsRequest = this.onMetricsRequest.bind(this);
        this.onHealthRequest = this.onHealthRequest.bind(this);

        this.app.get('/health', this.onHealthRequest);

        if (config.metrics?.enabled !== false) {
            metrics.addCollector(this.collectMetrics);
            this.app.get('/metrics', this.onMetricsRequest);
        }

        if (config.middleware) {
            this.app.use(config.middleware);
        } else {
            this.app.use(express.static(config.publicDirectory));
        }

        this.server.on('error', this.onError);
        this.server.on('upgrade', this.authorizationHandler);
        this.keepAliveLoop = setInterval(this.keepAlive, KEEP_ALIVE_INTERVAL);
        this.keepAliveLoop.unref();
    }

    /**
     * The port the server listens on (useful when it was started on any free port)
     */
    get port(): number {
        return (this.server.address() as AddressInfo).port;
    }

    /**
     * Start listening
     */
    listen() {
        return new Promise<this>((resolve) => {
            this.server.listen(this.config.port, () => {
                console.info('Listening on port %s', this.port);
                resolve(this);
            });
        });
    }

    /**
     * Stop the server
     */
    close() {
        clearInterval(this.keepAliveLoop);
        metrics.removeCollector(this.collectMetrics);

        for (const socket of this.sockets.clients) {
            socket.terminate();
        }

        this.sockets.close();
        this.server.close();
        this.config.storage?.close();
    }

    /**
     * Authorization Handler
     */
    authorizationHandler(request: any, socket: any, head: any) {
        // Upgrades that are not for the game (e.g. Vite's HMR socket) are handled elsewhere.
        if (request.headers.upgrade?.toLowerCase() !== 'websocket') {
            return socket.end();
        }

        const ip = request.headers['x-real-ip'] || request.socket.remoteAddress;
        const { searchParams } = new URL(request.url ?? '/', 'http://localhost');
        const token = searchParams.get('token');
        const tab = searchParams.get('tab');

        this.sockets.handleUpgrade(request, socket, head, (websocket: WebSocket) => {
            this.onSocketConnection(
                websocket,
                ip,
                token && SESSION_ID.test(token) ? token : null,
                tab && SESSION_ID.test(tab) ? tab : null
            );
        });
    }

    /**
     * Find the client that comes back with this token: the one of the same tab, else the one that lost its connection
     */
    findSession(token: string, tab: string | null): SocketClient | null {
        let found: SocketClient | null = null;

        for (const client of this.clients.items) {
            if (client.token !== token) {
                continue;
            }

            if (tab !== null && client.tab === tab) {
                return client;
            }

            if (!client.connected) {
                found = client;
            }
        }

        return found;
    }

    /**
     * On socket connection
     */
    onSocketConnection(socket: LiveSocket, ip: string, token: string | null = null, tab: string | null = null) {
        socket.isAlive = true;
        socket.on('pong', () => {
            socket.isAlive = true;
        });
        socket.on('error', this.onError);

        const session = token ? this.findSession(token, tab) : null;

        if (session) {
            session.tab = tab;
            session.resume(socket, ip);
            console.info('Client %s is back.', session.id);

            return;
        }

        const client = new SocketClient(socket, 1, ip);
        client.token = token;
        client.tab = tab;
        this.clients.add(client);

        client.on('close', this.onSocketDisconnection);
        client.pingLogger.on('latency', (latency: number) => metrics.latency.observe(latency / 1000));
        metrics.connections.inc();
        this.roomsController.attach(client);
        this.emit('client', client);

        console.info('Client %s connected.', client.id);
    }

    /**
     * Serve the metrics, to the clients that know the token when there is one
     */
    onMetricsRequest(request: Request, response: Response) {
        const token = this.config.metrics?.token;

        if (token && request.headers.authorization !== `Bearer ${token}`) {
            response.status(401).end();

            return;
        }

        response.type('text/plain; version=0.0.4').send(metrics.render());
    }

    /**
     * Refresh the gauges that describe what is going on
     */
    collectMetrics() {
        const { clients, rooms, games, players, avatars } = this.getStatus();

        metrics.clients.set(clients);
        metrics.rooms.set(rooms);
        metrics.activeGames.set(games);
        metrics.players.set(players);
        metrics.avatars.set(avatars);
    }

    /**
     * What is going on: connected clients, open rooms, games being played, players, avatars of the games
     */
    getStatus() {
        const rooms = this.roomRepository.rooms.items as Room[];
        const playing = rooms.filter((room) => room.game);

        return {
            clients: this.clients.count(),
            rooms: rooms.length,
            games: playing.length,
            players: rooms.reduce((total, room) => total + room.players.count(), 0),
            avatars: playing.reduce((total, room) => total + (room.game?.avatars?.count() ?? 0), 0)
        };
    }

    /**
     * For the health checks of Docker and the monitoring: the server answers, and tells how busy it is
     */
    onHealthRequest(request: Request, response: Response) {
        response.json({
            status: 'ok',
            version: this.config.version,
            uptime: Math.round(process.uptime()),
            ...this.getStatus(),
            storage: this.config.storage?.status() ?? { state: 'off' }
        });
    }

    /**
     * On socket disconnection
     */
    onSocketDisconnection(client: SocketClient) {
        console.info('Client %s disconnected.', client.id);

        this.clients.remove(client);
    }

    /**
     * Drop sockets that did not answer the last ping, ping the others.
     */
    keepAlive() {
        for (const socket of this.sockets.clients as Set<LiveSocket>) {
            if (!socket.isAlive) {
                socket.terminate();
                continue;
            }

            socket.isAlive = false;
            socket.ping();
        }
    }

    /**
     * On error
     */
    onError(error: Error) {
        console.error('Server Error:', error.stack);
    }
}
