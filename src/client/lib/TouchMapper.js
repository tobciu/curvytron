import EventEmitter from 'tom32i-event-emitter.js';

export default class TouchMapper extends EventEmitter {
    constructor() {
        super();
        this.listening = false;
        this.value = null;

        this.onTouch = this.onTouch.bind(this);
    }

    start() {
        if (!this.listening) {
            this.listening = true;
            window.addEventListener('touchstart', this.onTouch);
            this.emit('listening:start');
        }
    }

    stop() {
        if (this.listening) {
            this.listening = false;
            window.removeEventListener('touchstart', this.onTouch);
            this.emit('listening:stop');
        }
    }

    onTouch(e) {
        this.setValue(e.touches[0]);
        this.stop();
    }

    setValue(value) {
        if (this.value !== value) {
            this.value = value;
            this.emit('change');
        }
    }
}
