import { EventEmitter } from '#event-emitter';
import { gamepadListener } from '../gamepadListener.ts';

/**
 * Player input
 */
export class PlayerInput extends EventEmitter {
    avatar: any;
    key: boolean;
    active: any[];
    move: any;
    width: any;
    binding: any;

    /**
     * Key binding
     */
    defaultBinding: any[] = [37, 39];

    constructor(avatar: any, binding?: any) {
        super();

        this.avatar = avatar;
        this.key = false;
        this.active = [false, false];
        this.move = 0;
        this.width = 0;
        this.binding = typeof binding !== 'undefined' ? binding : this.defaultBinding;

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onAxis = this.onAxis.bind(this);
        this.onButton = this.onButton.bind(this);
        this.onTouch = this.onTouch.bind(this);

        this.attachEvents();
    }

    /**
     * Attach events
     */
    attachEvents() {
        const listening = [];
        let binding;
        let type;

        for (let i = this.binding.length - 1; i >= 0; i--) {
            binding = this.binding[i];
            type = this.getBindingType(binding);

            if (listening.indexOf(type) < 0) {
                listening.push(type);

                if (type === 'keyboard') {
                    window.addEventListener('keydown', this.onKeyDown);
                    window.addEventListener('keyup', this.onKeyUp);
                } else if (type === 'touch') {
                    window.addEventListener('touchstart', this.onTouch);
                    window.addEventListener('touchend', this.onTouch);
                    window.addEventListener('touchleave', this.onTouch);
                    window.addEventListener('touchcancel', this.onTouch);
                } else if (new RegExp('^gamepad:\\d+:button').test(type)) {
                    gamepadListener.on(type, this.onButton);
                } else {
                    gamepadListener.on(type, this.onAxis);
                }
            }
        }
    }

    /**
     * Detach events
     */
    detachEvents() {
        const listening = [];
        let binding;
        let type;

        for (let i = this.binding.length - 1; i >= 0; i--) {
            binding = this.binding[i];
            type = this.getBindingType(binding);

            if (listening.indexOf(type) < 0) {
                listening.push(type);

                if (type === 'keyboard') {
                    window.removeEventListener('keydown', this.onKeyDown);
                    window.removeEventListener('keyup', this.onKeyUp);
                } else if (type === 'touch') {
                    window.removeEventListener('touchstart', this.onTouch);
                    window.removeEventListener('touchend', this.onTouch);
                    window.removeEventListener('touchleave', this.onTouch);
                    window.removeEventListener('touchcancel', this.onTouch);
                } else if (new RegExp('^gamepad:\\d+:button').test(type)) {
                    gamepadListener.off(type, this.onButton);
                } else {
                    gamepadListener.off(type, this.onAxis);
                }
            }
        }
    }

    /**
     * Get binding type
     */
    getBindingType(binding: string): string {
        if (typeof Touch !== 'undefined' && (binding as unknown) instanceof Touch) {
            return 'touch';
        }

        const matches = new RegExp('^(gamepad:(\\d+):(button|axis):(\\d+))').exec(binding);

        return matches ? matches[1] : 'keyboard';
    }

    /**
     * On Key Down
     */
    onKeyDown(e: any) {
        const index = this.binding.indexOf(e.keyCode);

        if (index >= 0) {
            this.setActive(index, true);
        }
    }

    /**
     * On Key Down
     */
    onKeyUp(e: any) {
        const index = this.binding.indexOf(e.keyCode);

        if (index >= 0) {
            this.setActive(index, false);
        }
    }

    /**
     * On axis
     */
    onAxis(e: any) {
        const index = this.binding.indexOf(`gamepad:${e.detail.gamepad.index}:axis:${e.detail.axis}:${e.detail.value}`);

        if (index >= 0) {
            this.setActive(index, true);
        } else {
            for (let i = this.binding.length - 1; i >= 0; i--) {
                if (new RegExp(`^gamepad:${e.detail.gamepad.index}:axis:${e.detail.axis}`).test(this.binding[i])) {
                    this.setActive(i, false);
                }
            }
        }
    }

    /**
     * On button
     */
    onButton(e: any) {
        const index = this.binding.indexOf(`gamepad:${e.detail.gamepad.index}:button:${e.detail.index}`);

        if (index >= 0) {
            this.setActive(index, e.detail.pressed);
        }
    }

    /**
     * On touch start
     */
    onTouch(e: any) {
        e.preventDefault();

        const center = this.width / 2;
        const tests = [];
        let t;
        let i;
        let x;

        for (i = this.binding.length - 1; i >= 0; i--) {
            if (this.binding[i] instanceof Touch) {
                tests.push({ index: i, result: false });
            }
        }

        for (i = e.touches.length - 1; i >= 0; i--) {
            for (t = tests.length - 1; t >= 0; t--) {
                x = e.touches[i].screenX;
                if (tests[t].index === 0 ? x < center : x >= center) {
                    tests[t].result = true;
                }
            }
        }

        for (i = tests.length - 1; i >= 0; i--) {
            this.setActive(tests[i].index, tests[i].result);
        }
    }

    /**
     * Resolve
     */
    setActive(index: number, pressed: boolean) {
        if (this.active[index] !== pressed) {
            this.active[index] = pressed;
            this.resolve();
        }
    }

    /**
     * Resolve
     */
    resolve() {
        const move = this.active[0] !== this.active[1] ? (this.active[0] ? -1 : 1) : false;

        if (this.move !== move) {
            this.setMove(move);
        }
    }

    /**
     * Use gamepad?
     */
    useGamepad(): boolean {
        for (let i = this.binding.length - 1; i >= 0; i--) {
            if (new RegExp('^gamepad:').test(this.getBindingType(this.binding[i]))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Set move
     */
    setMove(move: number | boolean) {
        this.move = move;
        this.emit('move', { avatar: this.avatar, move });
    }

    /**
     * Set width
     */
    setWidth(width: number) {
        this.width = width;
    }
}
