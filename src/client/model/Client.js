import Collection from '../../shared/Collection.js';

/**
 * Distant client
 */
export default class Client {
    constructor(id, active) {
        this.id = id;
        this.players = new Collection();
        this.active = typeof (active) === 'undefined' || active;
        this.master = false;
    }

    /**
     * Set master
     *
     * @param {boolean} master
     */
    setMaster(master) {
        this.master = master;
    }
}
