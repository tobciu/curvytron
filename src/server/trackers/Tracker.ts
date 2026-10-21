import { md5 } from '../service/hash.ts';
import { EventEmitter } from '#event-emitter';

/**
 * Tracker
 */
export class Tracker extends EventEmitter {
    inspector: any;
    id: any;
    creation: any;
    uniqId: any;

    constructor(inspector: any, id: any) {
        super();

        this.inspector = inspector;
        this.id = id;
        this.creation = Date.now();
        this.uniqId = md5(`${this.creation}-${this.id}`);
    }

    /**
     * Destroy tracker
     */
    destroy() {
        return this;
    }

    /**
     * Get duration
     */
    getDuration(): number {
        return Date.now() - this.creation;
    }

    /**
     * Object version of the tracker
     */
    getValues(): Record<string, any> {
        return {
            mesuredDuration: this.getDuration(),
            id: this.uniqId
        };
    }

    /**
     * Get tags
     */
    getTags() {
        return {};
    }
}
