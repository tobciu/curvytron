import { Mapper } from './Mapper.js';

/**
 * Keyboard Mapper
 */
export class KeyboardMapper extends Mapper {
    constructor() {
        super();

        this.onKey = this.onKey.bind(this);
    }

    /**
     * Start listening
     */
    start() {
        if (super.start()) {
            window.addEventListener('keydown', this.onKey);
            window.addEventListener('keypress', this.kill);
        }
    }

    /**
     * Stop listening
     */
    stop() {
        if (super.stop()) {
            window.removeEventListener('keydown', this.onKey);
            window.removeEventListener('keypress', this.kill);
        }
    }

    /**
     * On key pressed
     *
     * @param {Event} e
     */
    onKey(e) {
        e.preventDefault();

        this.stop();
        this.setValue(e.keyCode);

        return false;
    }

    /**
     * Gues character from Key
     *
     * @param {Number} key
     *
     * @return {String}
     */
    guessChar(key) {
        key = key.toString();

        switch (key) {
            case '8':
                return 'Backspace';
            case '13':
                return 'Enter';
            case '16':
                return 'Maj';
            case '17':
                return 'Ctrl';
            case '18':
                return 'Alt';
            case '32':
                return 'Space';
            case '38':
                return '↑';
            case '40':
                return '↓';
            case '39':
                return '→';
            case '37':
                return '←';
            default:
                return String.fromCharCode(key);
        }
    }
}
