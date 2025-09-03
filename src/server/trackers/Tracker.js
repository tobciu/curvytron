import EventEmitter from 'tom32i-event-emitter.js';
import md5 from 'MD5';

/**
 * Tracker
 */
class Tracker extends EventEmitter {
    constructor(inspector, id) {
        super();

        this.inspector = inspector;
        this.id = id;
        this.creation = new Date().getTime();
        this.uniqId = md5(this.creation + '-' + this.id);
    }

    /**
     * Destroy tracker
     *
     * @return {Tracker}
     */
    destroy() {
        return this;
    }

    /**
     * Get duration
     *
     * @return {Number}
     */
    getDuration() {
        return new Date().getTime() - this.creation;
    }

    /**
     * Object version of the tracker
     *
     * @return {Object}
     */
    getValues() {
        return {
            mesuredDuration: this.getDuration(),
            id: this.uniqId
        };
    }

    /**
     * Get tags
     *
     * @return {Object}
     */
    getTags() {
        return {};
    }
}

export default Tracker;
