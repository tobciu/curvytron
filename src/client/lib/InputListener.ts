import { EventEmitter } from '#event-emitter';
import { KeyboardMapper } from './KeyboardMapper.ts';

/**
 * Input Listener
 */
export class InputListener extends EventEmitter {
    mapper: any;
    element: any;

    constructor(mapper: any, input?: any) {
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
    onMapperListening(e: any) {
        this.element.value = '';
        this.element.placeholder = '...';
    }

    /**
     * On mapper change value
     */
    onMapperChange(e: any) {
        this.element.value = this.mapper.view;
        this.element.placeholder = '';

        this.element.blur();
    }
}
