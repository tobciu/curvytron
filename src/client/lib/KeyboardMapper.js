import EventEmitter from 'tom32i-event-emitter.js';

export default class KeyboardMapper extends EventEmitter {
    constructor() {
        super();
        this.listening = false;
        this.value = null;

        this.onKeyDown = this.onKeyDown.bind(this);
    }

    start() {
        if (!this.listening) {
            this.listening = true;
            window.addEventListener('keydown', this.onKeyDown);
            this.emit('listening:start');
        }
    }

    stop() {
        if (this.listening) {
            this.listening = false;
            window.removeEventListener('keydown', this.onKeyDown);
            this.emit('listening:stop');
        }
    }

    onKeyDown(e) {
        this.setValue(e.keyCode);
        this.stop();
    }

    setValue(value) {
        if (this.value !== value) {
            this.value = value;
            this.emit('change');
        }
    }
}
