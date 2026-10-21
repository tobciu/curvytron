import { Mapper } from './Mapper.ts';

/**
 * Bind Input
 */
export class GamepadMapper extends Mapper {
    /**
     * Names of the positions of the sticks: by axis, then by direction
     */
    sticks: Record<string, Record<string, string>> = {
        0: { '-1': '←', 1: '→', 0: 'idle' },
        1: { '-1': '↑', 1: '↓', 0: 'idle' }
    };

    gamepadListener: any;
    indexGamepad: any;

    constructor(listener: any, indexGamepad?: any) {
        super();

        this.gamepadListener = listener;
        this.indexGamepad = indexGamepad !== undefined && indexGamepad;

        this.onAxis = this.onAxis.bind(this);
        this.onButton = this.onButton.bind(this);
    }

    /**
     * Start listening
     */
    override start(): boolean {
        if (super.start()) {
            this.gamepadListener.on('gamepad:axis', this.onAxis);
            this.gamepadListener.on('gamepad:button', this.onButton);

            return true;
        }

        return false;
    }

    /**
     * Stop listening
     */
    override stop(): boolean {
        if (super.stop()) {
            this.gamepadListener.off('gamepad:axis', this.onAxis);
            this.gamepadListener.off('gamepad:button', this.onButton);

            return true;
        }

        return false;
    }

    /**
     * On axis
     */
    onAxis(e: any) {
        const value = Math.sign(e.detail.value),
            prefix = this.indexGamepad ? `gamepad:${e.detail.gamepad.index}:` : '';

        this.setValue(`${prefix}axis:${e.detail.axis}:${value}`);
        this.stop();
    }

    /**
     * On button
     */
    onButton(e: any) {
        this.stop();

        const value = e.detail.index,
            prefix = this.indexGamepad ? `gamepad:${e.detail.gamepad.index}:` : '';

        this.setValue(`${prefix}button:${value}`);
    }

    /**
     * Gues character from Key
     */
    override guessChar(key: any): string {
        const axis = /^(gamepad:\d+:)?axis:(\d+):(-?\d+)$/i.exec(key),
            button = /^(gamepad:\d+:)?button:(\d+)$/i.exec(key);

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
 */
