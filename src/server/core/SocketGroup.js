import Collection from '../../shared/Collection.js';

/**
 * Socket group
 */
class SocketGroup {
    constructor(clients) {
        this.clients = typeof (clients) !== 'undefined' ? clients : new Collection();
    }

    /**
     * Add a listener
     *
     * @param {String} name
     * @param {Function} callback
     */
    on(name, callback) {
        for (let i = this.clients.items.length - 1; i >= 0; i--) {
            this.clients.items[i].on(name, callback);
        }
    }

    /**
     * Remove a listener
     *
     * @param {String} name
     * @param {Function} callback
     */
    removeListener(name, callback) {
        for (let i = this.clients.items.length - 1; i >= 0; i--) {
            this.clients.items[i].removeListener(name, callback);
        }
    }

    /**
     * Add a group of events event to the list
     *
     * @param {Array} events
     * @param {Boolean} force
     */
    addEvents(events, force) {
        for (let i = this.clients.items.length - 1; i >= 0; i--) {
            this.clients.items[i].addEvents(events, force);
        }
    }

    /**
     * Add an event to the list
     *
     * @param {String} name
     * @param {Object} data
     * @param {Function} callback
     * @param {Boolean} force
     */
    addEvent(name, data, callback, force) {
        for (let i = this.clients.items.length - 1; i >= 0; i--) {
            this.clients.items[i].addEvent(name, data, callback, force);
        }
    }
}

export default SocketGroup;
