import { Collection } from '../../shared/Collection.ts';

/**
 * Socket group
 */
export class SocketGroup {
    clients: any;

    constructor(clients?: any) {
        this.clients = typeof clients !== 'undefined' ? clients : new Collection();
    }

    /**
     * Add a listener
     */
    on(name: string, callback: (...args: any[]) => any) {
        for (let i = this.clients.items.length - 1; i >= 0; i--) {
            this.clients.items[i].on(name, callback);
        }
    }

    /**
     * Remove a listener
     */
    removeListener(name: string, callback: (...args: any[]) => any) {
        for (let i = this.clients.items.length - 1; i >= 0; i--) {
            this.clients.items[i].removeListener(name, callback);
        }
    }

    /**
     * Add a group of events event to the list
     */
    addEvents(events: any[], force?: boolean) {
        for (let i = this.clients.items.length - 1; i >= 0; i--) {
            this.clients.items[i].addEvents(events, force);
        }
    }

    /**
     * Add an event to the list
     */
    addEvent(name: string, data?: any, callback?: (...args: any[]) => any, force?: boolean) {
        for (let i = this.clients.items.length - 1; i >= 0; i--) {
            this.clients.items[i].addEvent(name, data, callback, force);
        }
    }
}
