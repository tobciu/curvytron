import { Collection } from '@shared/Collection.ts';
import type { SocketClient } from './SocketClient.ts';

/** Fan-out helper: forwards on/removeListener/addEvent(s) to every client in the group. */
export class SocketGroup {
  clients: Collection<SocketClient>;

  constructor(clients?: Collection<SocketClient>) {
    this.clients = clients ?? new Collection<SocketClient>();
  }

  on(name: string, callback: (...args: any[]) => void): void {
    for (let i = this.clients.items.length - 1; i >= 0; i--) {
      this.clients.items[i]!.on(name, callback);
    }
  }

  removeListener(name: string, callback: (...args: any[]) => void): void {
    for (let i = this.clients.items.length - 1; i >= 0; i--) {
      this.clients.items[i]!.removeListener(name, callback);
    }
  }

  addEvents(events: any[], force?: boolean): void {
    for (let i = this.clients.items.length - 1; i >= 0; i--) {
      this.clients.items[i]!.addEvents(events, force);
    }
  }

  addEvent(name: string, data?: any, callback?: any, force?: boolean): void {
    for (let i = this.clients.items.length - 1; i >= 0; i--) {
      this.clients.items[i]!.addEvent(name, data, callback, force);
    }
  }
}
