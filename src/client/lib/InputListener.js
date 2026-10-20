import { EventEmitter } from '#event-emitter';
import { KeyboardMapper } from './KeyboardMapper.js';

/**
 * Input Listener
 *
 * @param {Mapper} mapper
 * @param {Element} input
 */
export class InputListener extends EventEmitter {
    constructor(mapper, input) {
        super();

        this.mapper = mapper;
        this.element = typeof input === 'string' ? document.getElementById(input) : input;

        this.onMapperListening = this.onMapperListening.bind(this);
        this.onMapperChange = this.onMapperChange.bind(this);

        this.element.addEventListener('focus', mapper.start);
        this.element.addEventListener('blur', mapper.stop);

        if (!(mapper instanceof KeyboardMapper)) {
            this.element.addEventListener('keyup', mapper.kill);
            this.element.addEventListener('keydown', mapper.kill);
            this.element.addEventListener('keypress', mapper.kill);
        }

        this.mapper.on('listening:start', this.onMapperListening);
        this.mapper.on('listening:stop', this.onMapperChange);
        this.mapper.on('change', this.onMapperChange);
    }

    /**
     * On mapper listening
     */
    onMapperListening(e) {
        this.element.value = '';
        this.element.placeholder = '...';
    }

    /**
     * On mapper change value
     */
    onMapperChange(e) {
        this.element.value = this.mapper.view;
        this.element.placeholder = '';

        this.element.blur();
    }
}
