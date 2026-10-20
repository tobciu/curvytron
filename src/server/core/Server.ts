import http from 'node:http';
import express from 'express';
import { WebSocketServer, type WebSocket } from 'ws';
import { EventEmitter } from '#event-emitter';
import { RoomsController } from '../controller/RoomsController.ts';
import { SocketClient } from './SocketClient.ts';
import { RoomRepository } from '../repository/RoomRepository.ts';
import { Collection } from '../../shared/Collection.ts';

/**
 * Seconds between two keep-alive pings sent to every connected socket.
 */
const KEEP_ALIVE_INTERVAL = 30000;

/**
 * Server
 *
 * @param config.publicDirectory Directory of the built client
 * @param [config.middleware] Extra express middleware (the Vite dev server in development)
 */
export class Server extends EventEmitter {
    config: any;
    app: any;
    server: any;
    sockets: any;
    clients: Collection;
    roomRepository: RoomRepository;
    roomsController: RoomsController;
    keepAliveLoop: any;

    constructor(config: any) {
        super();

        this.config = config;
        this.app = express();
        this.server = http.createServer(this.app);
        this.sockets = new WebSocketServer({
            noServer: true,
            handleProtocols: (protocols) => (protocols.has('websocket') ? 'websocket' : false)
        });
        this.clients = new Collection([], 'id', true);

        this.roomRepository = new RoomRepository();
        this.roomsController = new RoomsController(this.roomRepository);

        this.authorizationHandler = this.authorizationHandler.bind(this);
        this.onSocketConnection = this.onSocketConnection.bind(this);
        this.onSocketDisconnection = this.onSocketDisconnection.bind(this);
        this.onError = this.onError.bind(this);
        this.keepAlive = this.keepAlive.bind(this);

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
     * Start listening
     */
    listen() {
        return new Promise((resolve) => {
            this.server.listen(this.config.port, () => {
                console.info('Listening on port %s', this.server.address().port);
                resolve(this);
            });
        });
    }

    /**
     * Stop the server
     */
    close() {
        clearInterval(this.keepAliveLoop);

        for (const socket of this.sockets.clients) {
            socket.terminate();
        }

        this.sockets.close();
        this.server.close();
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

        this.sockets.handleUpgrade(request, socket, head, (websocket: WebSocket) => {
            this.onSocketConnection(websocket, ip);
        });
    }

    /**
     * On socket connection
     */
    onSocketConnection(socket: any, ip: string) {
        socket.isAlive = true;
        socket.on('pong', () => {
            socket.isAlive = true;
        });
        socket.on('error', this.onError);

        const client = new SocketClient(socket, 1, ip);
        this.clients.add(client);

        client.on('close', this.onSocketDisconnection);
        this.roomsController.attach(client);
        this.emit('client', client);

        console.info('Client %s connected.', client.id);
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
        for (const socket of this.sockets.clients) {
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
