import EventEmitter from 'tom32i-event-emitter.js';
import OptionResolver from './OptionResolver.js';

/**
 * Gamepad Handler
 */
class GamepadHandler extends EventEmitter {
    constructor(gamepad, options) {
        super();

        this.gamepad = gamepad;
        this.options = this.resolveOptions(typeof(options) === 'object' ? options : {});
        this.sticks = new Array(this.gamepad.axes.length);
        this.buttons = new Array(this.gamepad.buttons.length);

        for (let s = this.sticks.length - 1; s >= 0; s--) {
            this.sticks[s] = [0, 0];
        }

        for (let b = this.buttons.length - 1; b >= 0; b--) {
            this.buttons[b] = 0;
        }

        this.gamepad.handler = this;
    }

    /**
     * Option resolver
     *
     * @type {OptionResolver}
     */
    optionResolver = new OptionResolver(false);

    /**
     * Resolve options
     *
     * @param {Object} options
     *
     * @return {Object}
     */
    resolveOptions(source) {
        const customStick = typeof source.stick !== 'undefined';
        const customButton = typeof source.button !== 'undefined';
        const options = {
            stick: this.optionResolver.resolve(customStick ? source.stick : (customButton ? {} : source)),
            button: this.optionResolver.resolve(customButton ? source.button : (customStick ? {} : source))
        };

        options.stick.deadZone = Math.max(Math.min(options.stick.deadZone, 1), 0);
        options.button.deadZone = Math.max(Math.min(options.button.deadZone, 1), 0);
        options.stick.precision = options.stick.precision ? Math.pow(10, options.stick.precision) : 0;
        options.button.precision = options.button.precision ? Math.pow(10, options.button.precision) : 0;

        return options;
    }

    /**
     * Update
     */
    update() {
        let i = 0;
        let s = 0;
        let a = 0;

        for (s = 0; s < 2; s++) {
            for (a = 0; a < 2; a++) {
                this.setStick(s, a, this.gamepad.axes[i], this.options.stick);
                i++;
            }
        }

        for (i = this.gamepad.buttons.length - 1; i >= 0; i--) {
            this.setButton(i, this.gamepad.buttons[i], this.options.button);
        }
    }

    /**
     * Set stick
     *
     * @param {Number} stick
     * @param {Number} axis
     * @param {Number} value
     */
    setStick(stick, axis, value, options) {
        if (options.deadZone && value < options.deadZone && value > -options.deadZone) {
            value = 0;
        }

        if (!options.analog) {
            value = value > 0 ? 1 : value < 0 ? -1 : 0;
        } else if (options.precision) {
            value = Math.round(value * options.precision) / options.precision;
        }

        if (this.sticks[stick][axis] !== value) {
            this.sticks[stick][axis] = value;
            this.emit('axis', {
                gamepad: this.gamepad,
                axis: axis,
                value: this.sticks[stick][axis]
            });
        }
    }

    /**
     * Set button
     *
     * @param {Number} index
     * @param {GamepadButton} button
     */
    setButton(index, button, options) {
        let value = button.value;

        if (options.deadZone && button.value < options.deadZone && button.value > -options.deadZone) {
            value = 0;
        }

        if (!options.analog) {
            value = button.pressed ? 1 : 0;
        } else if (options.precision) {
            value = Math.round(value * options.precision) / options.precision;
        }

        if (this.buttons[index] !== value) {
            this.buttons[index] = value;
            this.emit('button', {
                gamepad: this.gamepad,
                button: button,
                index: index,
                pressed: button.pressed,
                value: value
            });
        }
    }
}

/**
 * Gamepad Listener
 */
class GamepadListener extends EventEmitter {
    constructor(options) {
        super();

        this.options = typeof(options) === 'object' ? options : {};
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
                if (typeof(gamepads[i].handler) === 'undefined') {
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

        this.emit('gamepad:connected', {gamepad: gamepad, index: gamepad.index});
        this.emit('gamepad:' + gamepad.index + ':connected', {gamepad: gamepad, index: gamepad.index});

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

        this.emit('gamepad:disconnected', {index: index});
        this.emit('gamepad:' + index + ':disconnected', {index: index});

        this.handlers[index] = null;
    }

    /**
     * On axe
     *
     * @param {Event} event
     */
    onAxis(event) {
        this.emit('gamepad:axis', event.detail);
        this.emit('gamepad:' + event.detail.gamepad.index + ':axis', event.detail);
        this.emit('gamepad:' + event.detail.gamepad.index + ':axis:' + event.detail.axis, event.detail);
    }

    /**
     * On button
     *
     * @param {Event} event
     */
    onButton(event) {
        this.emit('gamepad:button', event.detail);
        this.emit('gamepad:' + event.detail.gamepad.index + ':button', event.detail);
        this.emit('gamepad:' + event.detail.gamepad.index + ':button:' + event.detail.index, event.detail);
    }

    /**
     * Get gampads
     *
     * @return {GamepadList}
     */
    getGamepads() {
        const gamepads = typeof(navigator.getGamepads) !== 'undefined' ? navigator.getGamepads() : null;

        return gamepads && typeof(gamepads) === 'object' ? gamepads : [];
    }
}

export default GamepadListener;
