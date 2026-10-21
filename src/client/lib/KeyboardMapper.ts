import { Mapper } from './Mapper.ts';

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
    override start(): boolean {
        if (super.start()) {
            globalThis.addEventListener('keydown', this.onKey);
            globalThis.addEventListener('keypress', this.kill);

            return true;
        }

        return false;
    }

    /**
     * Stop listening
     */
    override stop(): boolean {
        if (super.stop()) {
            globalThis.removeEventListener('keydown', this.onKey);
            globalThis.removeEventListener('keypress', this.kill);

            return true;
        }

        return false;
    }

    /**
     * On key pressed
     */
    onKey(e: any) {
        e.preventDefault();

        this.stop();
        this.setValue(e.keyCode);

        return false;
    }

    /**
     * Gues character from Key
     */
    override guessChar(key: any): string {
        switch (key.toString()) {
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
                return String.fromCodePoint(key);
        }
    }
}
