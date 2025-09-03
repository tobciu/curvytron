import EventEmitter from 'tom32i-event-emitter.js';

export default class GamepadMapper extends EventEmitter {
    constructor(gamepadListener, button) {
        super();
        this.gamepadListener = gamepadListener;
        this.button = button;
        this.listening = false;
        this.value = null;

        this.onButton = this.onButton.bind(this);
        this.onAxis = this.onAxis.bind(this);
    }

    start() {
        if (!this.listening) {
            this.listening = true;
            // if (this.button) {
            //     this.gamepadListener.on('gamepad:button', this.onButton);
            // } else {
            //     this.gamepadListener.on('gamepad:axis', this.onAxis);
            // }
            this.emit('listening:start');
        }
    }

    stop() {
        if (this.listening) {
            this.listening = false;
            // if (this.button) {
            //     this.gamepadListener.off('gamepad:button', this.onButton);
            // } else {
            //     this.gamepadListener.off('gamepad:axis', this.onAxis);
            // }
            this.emit('listening:stop');
        }
    }

    onButton(e) {
        this.setValue('gamepad:' + e.detail.gamepad.index + ':button:' + e.detail.index);
        this.stop();
    }

    onAxis(e) {
        this.setValue('gamepad:' + e.detail.gamepad.index + ':axis:' + e.detail.axis + ':' + e.detail.value);
        this.stop();
    }

    setValue(value) {
        if (this.value !== value) {
            this.value = value;
            this.emit('change');
        }
    }
}
