import Collection from '../../shared/Collection.js';
import EventEmitter from 'tom32i-event-emitter.js';
import GamepadMapper from '../lib/GamepadMapper.js';
import KeyboardMapper from '../lib/KeyboardMapper.js';
import TouchMapper from '../lib/TouchMapper.js';

const gamepadListener = {}; // TODO: Implement GamepadListener

/**
 * Player control
 */
export default class PlayerControl extends EventEmitter {
    constructor(value, icon) {
        super();

        this.icon = icon;
        this.listening = false;
        this.mappers = new Collection();

        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);

        this.addMapper('keyboard', new KeyboardMapper());
        this.addMapper('touch', new TouchMapper());
        this.addMapper('gamepad', new GamepadMapper(gamepadListener, true));

        this.mapper = this.mappers.getById('keyboard');
        this.mapper.setValue(value);
    }

    addMapper(id, mapper) {
        mapper.id = id;
        mapper.on('change', (e) => this.setMapper(mapper));
        mapper.on('listening:stop', this.stop);
        this.mappers.add(mapper);
    }

    setMapper(mapper) {
        this.mapper = mapper;
        this.emit('change');
    }

    getMapping() {
        return {
            'mapper': this.mapper.id,
            'value': this.mapper.value
        };
    }

    loadMapping(mapping) {
        const mapper = this.mappers.getById(mapping.mapper);
        if (mapper) {
            this.setMapper(mapper);
            this.mapper.setValue(mapping.value);
        }
    }

    toggle() {
        if (this.mapper.listening) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        for (let i = this.mappers.items.length - 1; i >= 0; i--) {
            this.mappers.items[i].start();
        }
    }

    stop() {
        for (let i = this.mappers.items.length - 1; i >= 0; i--) {
            this.mappers.items[i].stop();
        }
    }
}
