import { Mapper } from './Mapper.js';

/**
 * Bind Input
 *
 * @param {GamepadListener} listener
 * @param {boolean} indexGamepad
 */
export class GamepadMapper extends Mapper {
    constructor(listener, indexGamepad) {
        super();

        this.gamepadListener = listener;
        this.indexGamepad = typeof indexGamepad !== 'undefined' && indexGamepad;

        this.onAxis = this.onAxis.bind(this);
        this.onButton = this.onButton.bind(this);
    }

    /**
     * Start listening
     */
    start() {
        if (super.start()) {
            this.gamepadListener.on('gamepad:axis', this.onAxis);
            this.gamepadListener.on('gamepad:button', this.onButton);
        }
    }

    /**
     * Stop listening
     */
    stop() {
        if (super.stop()) {
            this.gamepadListener.off('gamepad:axis', this.onAxis);
            this.gamepadListener.off('gamepad:button', this.onButton);
        }
    }

    /**
     * On axis
     *
     * @param {Event} e
     */
    onAxis(e) {
        const value = e.detail.value > 0 ? 1 : e.detail.value < 0 ? -1 : 0,
            prefix = this.indexGamepad ? `gamepad:${e.detail.gamepad.index}:` : '';

        this.setValue(`${prefix}axis:${e.detail.axis}:${value}`);
        this.stop();
    }

    /**
     * On button
     *
     * @param {Event} e
     */
    onButton(e) {
        this.stop();

        const value = e.detail.index,
            prefix = this.indexGamepad ? `gamepad:${e.detail.gamepad.index}:` : '';

        this.setValue(`${prefix}button:${value}`);
    }

    /**
     * Gues character from Key
     *
     * @param {Number} key
     *
     * @return {String}
     */
    guessChar(key) {
        const axis = new RegExp('^(gamepad:\\d+:)?axis:(\\d+):(-?\\d+)$', 'gi').exec(key),
            button = new RegExp('^(gamepad:\\d+:)?button:(\\d+)$', 'gi').exec(key);

        if (axis) {
            return `Stick ${this.sticks[axis[2]][axis[3]]}`;
        } else if (button) {
            return `Button (${button[2]})`;
        }

        return key;
    }
}

/**
 * Sticks
 *
 * @type {Object}
 */
GamepadMapper.prototype.sticks = {
    0: { '-1': '←', 1: '→', 0: 'idle' },
    1: { '-1': '↑', 1: '↓', 0: 'idle' }
};
