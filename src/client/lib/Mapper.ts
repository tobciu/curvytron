import { EventEmitter } from '#event-emitter';

/**
 * Mapper
 */
export class Mapper extends EventEmitter {
    value: any;
    view: any;
    listening: boolean;

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
     */
    setValue(value: any) {
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
     */
    kill(e: any): boolean {
        e.preventDefault();

        return false;
    }

    /**
     * Gues character from Key
     */
    guessChar(key: any): string {
        return key.toString();
    }
}
