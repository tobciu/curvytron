import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { WebSocketServer, type WebSocket } from 'ws';
import { EventEmitter } from 'eventemitter3';
import { Collection } from '@shared/Collection.ts';
import { RoomRepository } from '../repository/RoomRepository.ts';
import { RoomsController } from '../controller/RoomsController.ts';
import { SocketClient } from './SocketClient.ts';

export interface ServerConfig {
  port: number;
  staticDir?: string;
}

/** HTTP (static files) + WebSocket accept loop. */
export class Server extends EventEmitter {
  config: ServerConfig;
  app: express.Express;
  server: http.Server;
  wss: WebSocketServer;
  clients = new Collection<SocketClient>([], 'id', true);
  roomRepository = new RoomRepository();
  roomsController: RoomsController;

  constructor(config: ServerConfig) {
    super();

    this.config = config;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ noServer: true });
    this.roomsController = new RoomsController(this.roomRepository);

    this.onSocketDisconnection = this.onSocketDisconnection.bind(this);
    this.onError = this.onError.bind(this);

    this.app.use(express.static(config.staticDir ?? 'web'));

    this.server.on('error', this.onError);
    this.server.on('upgrade', (request, socket, head) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        const ip =
          (request.headers['x-real-ip'] as string | undefined) ??
          request.socket.remoteAddress ??
          '';
        this.onSocketConnection(ws, ip);
      });
    });

    this.server.listen(config.port, () => {
      const addr = this.server.address() as AddressInfo | null;
      console.info('Listening on port %s', addr?.port ?? config.port);
    });
  }

  onSocketConnection(ws: WebSocket, ip: string): void {
    const client = new SocketClient(ws, 1, ip);
    this.clients.add(client);

    client.on('close', this.onSocketDisconnection);
    this.roomsController.attach(client);
    this.emit('client', client);

    console.info('Client %s connected.', client.id);
  }

  onSocketDisconnection(client: SocketClient): void {
    console.info('Client %s disconnected.', client.id);
    this.clients.remove(client);
  }

  onError(error: Error): void {
    console.error('Server Error:', error.stack);
  }
}
