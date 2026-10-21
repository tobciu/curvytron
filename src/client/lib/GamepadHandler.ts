import { EventEmitter } from '#event-emitter';
import { OptionResolver } from './OptionResolver.ts';

/**
 * Gamepad Handler
 */
export class GamepadHandler extends EventEmitter {
    /**
     * Option resolver
     */
    static optionResolver: OptionResolver = new OptionResolver(false)
        .setDefaults({
            analog: true,
            deadZone: 0,
            precision: 0
        })
        .setTypes({
            analog: 'boolean',
            deadZone: 'number',
            precision: 'number'
        });

    gamepad: any;
    options: any;
    sticks: any;
    buttons: any;

    constructor(gamepad: any, options?: any) {
        super();

        this.gamepad = gamepad;
        this.options = this.resolveOptions(typeof options === 'object' ? options : {});
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
     * Resolve options
     */
    resolveOptions(source?: any) {
        const customStick = source.stick !== undefined,
            customButton = source.button !== undefined;
        let stickSource;
        let buttonSource;

        if (customStick) {
            stickSource = source.stick;
        } else if (customButton) {
            stickSource = {};
        } else {
            stickSource = source;
        }

        if (customButton) {
            buttonSource = source.button;
        } else if (customStick) {
            buttonSource = {};
        } else {
            buttonSource = source;
        }

        const options = {
            stick: GamepadHandler.optionResolver.resolve(stickSource),
            button: GamepadHandler.optionResolver.resolve(buttonSource)
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
        let i = 0,
            s = 0,
            a = 0;

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
     */
    setStick(stick: number, axis: number, value: number, options: any) {
        if (options.deadZone && value < options.deadZone && value > -options.deadZone) {
            value = 0;
        }

        if (!options.analog) {
            value = Math.sign(value);
        } else if (options.precision) {
            value = Math.round(value * options.precision) / options.precision;
        }

        if (this.sticks[stick][axis] !== value) {
            this.sticks[stick][axis] = value;
            this.emit('axis', {
                gamepad: this.gamepad,
                axis,
                value: this.sticks[stick][axis]
            });
        }
    }

    /**
     * Set button
     */
    setButton(index: number, button: any, options: any) {
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
                button,
                index,
                pressed: button.pressed,
                value
            });
        }
    }
}
