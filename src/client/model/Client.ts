import { Collection } from '../../shared/Collection.ts';
import type { Player } from './Player.ts';

/**
 * Distant client
 */
export class Client {
    id: any;
    players: Collection<Player>;
    active: any;
    master: any;

    constructor(id: any, active?: any) {
        this.id = id;
        this.players = new Collection<Player>();
        this.active = active === undefined || active;
        this.master = false;
    }

    /**
     * Set master
     */
    setMaster(master: any) {
        this.master = master;
    }
}
