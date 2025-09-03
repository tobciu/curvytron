import EventEmitter from 'events';
import http from 'http';
import express from 'express';
import WebSocket from 'faye-websocket';
import Collection from '../../shared/Collection.js';
import RoomRepository from '../repository/RoomRepository.js';
import RoomsController from '../controller/RoomsController.js';
import SocketClient from './SocketClient.js';

/**
 * Server
 */
class Server extends EventEmitter {
    constructor(config) {
        super();

        this.config = config;
        this.app = express();
        this.server = new http.Server(this.app);
        this.clients = new Collection([], 'id', true);

        this.roomRepository = new RoomRepository();
        this.roomsController = new RoomsController(this.roomRepository);

        this.authorizationHandler = this.authorizationHandler.bind(this);
        this.onSocketConnection = this.onSocketConnection.bind(this);
        this.onSocketDisconnection = this.onSocketDisconnection.bind(this);
        this.onError = this.onError.bind(this);

        this.app.use(express.static('web'));

        this.server.on('error', this.onError);
        this.server.on('upgrade', this.authorizationHandler);
        this.server.listen(config.port);

        console.info('Listening on port %s', config.port);
    }

    /**
     * Authorization Handler
     *
     * @param {Object} request
     * @param {Object} socket
     * @param {Buffer} body
     */
    authorizationHandler(request, socket, head) {
        if (!WebSocket.isWebSocket(request)) {
            return socket.end();
        }

        const websocket = new WebSocket(request, socket, head, ['websocket'], { ping: 30 });
        const ip = request.headers['x-real-ip'] || request.connection.remoteAddress;

        return this.onSocketConnection(websocket, ip);
    }

    /**
     * On socket connection
     *
     * @param {Socket} socket
     * @param {String} ip
     */
    onSocketConnection(socket, ip) {
        const client = new SocketClient(socket, 1, ip);
        this.clients.add(client);

        client.on('close', this.onSocketDisconnection);
        this.roomsController.attach(client);
        this.emit('client', client);

        console.info('Client %s connected.', client.id);
    }

    /**
     * On socket connection
     *
     * @param {SocketClient} client
     */
    onSocketDisconnection(client) {
        console.info('Client %s disconnected.', client.id);
        this.clients.remove(client);
    }

    /**
     * On error
     *
     * @param {Error} error
     */
    onError(error) {
        console.error('Server Error:', error.stack);
    }
}

export default Server;
