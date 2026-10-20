import { EventEmitter } from '#event-emitter';
import { Collection } from '../../shared/Collection.js';
import { gamepadListener } from '../gamepadListener.js';
import { GamepadMapper } from '../lib/GamepadMapper.js';
import { KeyboardMapper } from '../lib/KeyboardMapper.js';
import { TouchMapper } from '../lib/TouchMapper.js';

/**
 * Player control
 */
export class PlayerControl extends EventEmitter {
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

    /**
     * Create mapper
     *
     * @param {String} id
     * @param {Mapper} mapper
     */
    addMapper(id, mapper) {
        const control = this;

        mapper.id = id;

        mapper.on('change', function (e) {
            return control.setMapper(mapper);
        });
        mapper.on('listening:stop', this.stop);

        this.mappers.add(mapper);
    }

    /**
     * Set mapper
     *
     * @param {Mapper} mapper
     */
    setMapper(mapper) {
        this.mapper = mapper;
        this.emit('change');
    }

    /**
     * Get mapping
     *
     * @return {Object}
     */
    getMapping() {
        return {
            mapper: this.mapper.id,
            value: this.mapper.value
        };
    }

    /**
     * Load mapping
     *
     * @param {Object} mapping
     */
    loadMapping(mapping) {
        const mapper = this.mappers.getById(mapping.mapper);

        if (mapper) {
            this.setMapper(mapper);
            this.mapper.setValue(mapping.value);
        }
    }

    /**
     * Toggle
     */
    toggle() {
        if (this.mapper.listening) {
            this.stop();
        } else {
            this.start();
        }
    }

    /**
     * Start listening
     */
    start() {
        for (let i = this.mappers.items.length - 1; i >= 0; i--) {
            this.mappers.items[i].start();
        }
    }

    /**
     * Start listening
     */
    stop() {
        for (let i = this.mappers.items.length - 1; i >= 0; i--) {
            this.mappers.items[i].stop();
        }
    }
}
