import EventEmitter from 'tom32i-event-emitter.js';
import GamepadListener from '../lib/GamepadListener.js';

/**
 * Player input
 */
export default class PlayerInput extends EventEmitter {
    constructor(avatar, binding) {
        super();

        this.avatar = avatar;
        this.key = false;
        this.active = [false, false];
        this.move = 0;
        this.width = 0;
        this.binding = typeof (binding) !== 'undefined' ? binding : this.defaultBinding;

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onAxis = this.onAxis.bind(this);
        this.onButton = this.onButton.bind(this);
        this.onTouch = this.onTouch.bind(this);

        this.gamepadListener = new GamepadListener();
        this.attachEvents();
    }

    /**
     * Key binding
     *
     * @type {Object}
     */
    defaultBinding = [37, 39];

    /**
     * Attach events
     */
    attachEvents() {
        let listening = [],
            binding, type;

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
                    this.gamepadListener.on(type, this.onButton);
                } else {
                    this.gamepadListener.on(type, this.onAxis);
                }
            }
        }
        this.gamepadListener.start();
    }

    /**
     * Detach events
     */
    detachEvents() {
        let listening = [],
            binding, type;

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
                    this.gamepadListener.off(type, this.onButton);
                } else {
                    this.gamepadListener.off(type, this.onAxis);
                }
            }
        }
        this.gamepadListener.stop();
    }

    /**
     * Get binding type
     *
     * @param {String} binding
     *
     * @return {String}
     */
    getBindingType(binding) {
        if (typeof (Touch) !== 'undefined' && binding instanceof Touch) {
            return 'touch';
        }

        const matches = new RegExp('^(gamepad:(\\d+):(button|axis):(\\d+))').exec(binding);

        return matches ? matches[1] : 'keyboard';
    }

    /**
     * On Key Down
     *
     * @param {Event} e
     */
    onKeyDown(e) {
        const index = this.binding.indexOf(e.keyCode);

        if (index >= 0) {
            this.setActive(index, true);
        }
    }

    /**
     * On Key Down
     *
     * @param {Event} e
     */
    onKeyUp(e) {
        const index = this.binding.indexOf(e.keyCode);

        if (index >= 0) {
            this.setActive(index, false);
        }
    }

    /**
     * On axis
     *
     * @param {Event} e
     */
    onAxis(e) {
        const index = this.binding.indexOf('gamepad:' + e.detail.gamepad.index + ':axis:' + e.detail.axis + ':' + e.detail.value);

        if (index >= 0) {
            this.setActive(index, true);
        } else {
            for (let i = this.binding.length - 1; i >= 0; i--) {
                if (new RegExp('^gamepad:' + e.detail.gamepad.index + ':axis:' + e.detail.axis).test(this.binding[i])) {
                    this.setActive(i, false);
                }
            }
        }
    }

    /**
     * On button
     *
     * @param {Event} e
     */
    onButton(e) {
        const index = this.binding.indexOf('gamepad:' + e.detail.gamepad.index + ':button:' + e.detail.index);

        if (index >= 0) {
            this.setActive(index, e.detail.pressed);
        }
    }

    /**
     * On touch start
     *
     * @param {Event} e
     */
    onTouch(e) {
        e.preventDefault();

        const center = this.width / 2,
            tests = [];
        let t, i, x;

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
     *
     * @param {Number} index
     * @param {Boolean} pressed
     */
    setActive(index, pressed) {
        if (this.active[index] !== pressed) {
            this.active[index] = pressed;
            this.resolve();
        }
    }

    /**
     * Resolve
     */
    resolve() {
        const move = (this.active[0] !== this.active[1]) ? (this.active[0] ? -1 : 1) : false;

        if (this.move !== move) {
            this.setMove(move);
        }
    }

    /**
     * Use gamepad?
     *
     * @return {Boolean}
     */
    useGamepad() {
        for (let i = this.binding.length - 1; i >= 0; i--) {
            if (new RegExp('^gamepad:').test(this.getBindingType(this.binding[i]))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Set move
     *
     * @param {Boolean} move
     */
    setMove(move) {
        this.move = move;
        this.emit('move', { avatar: this.avatar, move: move });
    }

    /**
     * Set width
     *
     * @param {Number} width
     */
    setWidth(width) {
        this.width = width;
    }
}
