import { EventEmitter } from '#event-emitter';

/**
 * Mapper
 *
 * @param {String} id
 */
export class Mapper extends EventEmitter {
    constructor() {
        super();

        this.value = null;
        this.view = null;
        this.listening = false;

        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
    }

    /**
     * Mapper
     *
     * @param {String} value
     */
    setValue(value) {
        if (this.value !== value) {
            this.value = value;
            this.view = this.guessChar(this.value);
            this.emit('change', { value: this.value, view: this.view });
        }
    }

    /**
     * Start listening
     */
    start() {
        if (!this.listening) {
            this.listening = true;
            this.emit('listening:start');

            return true;
        }

        return false;
    }

    /**
     * Stop listening
     */
    stop() {
        if (this.listening) {
            this.listening = false;
            this.emit('listening:stop');
            return true;
        }

        return false;
    }

    /**
     * Kill an event
     *
     * @param {Event} e
     *
     * @return {Boolean}
     */
    kill(e) {
        e.preventDefault();

        return false;
    }

    /**
     * Gues character from Key
     *
     * @param {Number} key
     *
     * @return {String}
     */
    guessChar(key) {
        return key.toString();
    }
}
