import { EventEmitter } from '#event-emitter';
import { GamepadHandler } from './GamepadHandler.js';

/**
 * Gamepad Listener
 */
export class GamepadListener extends EventEmitter {
    constructor(options) {
        super();

        this.options = typeof options === 'object' ? options : {};
        this.frame = null;
        this.update = this.update.bind(this);
        this.onAxis = this.onAxis.bind(this);
        this.onButton = this.onButton.bind(this);
        this.stop = this.stop.bind(this);
        this.handlers = new Array(4);

        window.addEventListener('error', this.stop);
    }

    /**
     * Start
     */
    start() {
        if (!this.frame) {
            this.update();
        }
    }

    /**
     * Stop
     */
    stop() {
        if (this.frame) {
            window.cancelAnimationFrame(this.frame);
            this.frame = null;
        }
    }

    /**
     * Update
     */
    update() {
        this.frame = window.requestAnimationFrame(this.update);

        const gamepads = this.getGamepads();

        for (let i = gamepads.length - 1; i >= 0; i--) {
            if (gamepads[i]) {
                if (typeof gamepads[i].handler === 'undefined') {
                    this.addGamepad(gamepads[i]);
                }

                gamepads[i].handler.update();
            } else if (this.handlers[i]) {
                this.removeGamepad(i);
            }
        }
    }

    /**
     * Add gamepad
     *
     * @param {Gamepad} gamepad
     */
    addGamepad(gamepad) {
        const handler = new GamepadHandler(gamepad, this.options);

        handler.on('axis', this.onAxis);
        handler.on('button', this.onButton);

        this.emit('gamepad:connected', { gamepad, index: gamepad.index });
        this.emit(`gamepad:${gamepad.index}:connected`, { gamepad, index: gamepad.index });

        this.handlers[gamepad.index] = handler;
    }

    /**
     * Add gamepad
     *
     * @param {Gamepad} gamepad
     */
    removeGamepad(index) {
        const handler = this.handlers[index];

        handler.off('axis', this.onAxis);
        handler.off('button', this.onButton);

        this.emit('gamepad:disconnected', { index });
        this.emit(`gamepad:${index}:disconnected`, { index });

        this.handlers[index] = null;
    }

    /**
     * On axe
     *
     * @param {Event} event
     */
    onAxis(event) {
        this.emit('gamepad:axis', event.detail);
        this.emit(`gamepad:${event.detail.gamepad.index}:axis`, event.detail);
        this.emit(`gamepad:${event.detail.gamepad.index}:axis:${event.detail.axis}`, event.detail);
    }

    /**
     * On button
     *
     * @param {Event} event
     */
    onButton(event) {
        this.emit('gamepad:button', event.detail);
        this.emit(`gamepad:${event.detail.gamepad.index}:button`, event.detail);
        this.emit(`gamepad:${event.detail.gamepad.index}:button:${event.detail.index}`, event.detail);
    }

    /**
     * Get gampads
     *
     * @return {GamepadList}
     */
    getGamepads() {
        const gamepads = typeof navigator.getGamepads !== 'undefined' ? navigator.getGamepads() : null;

        return gamepads && typeof gamepads === 'object' ? gamepads : [];
    }
}
