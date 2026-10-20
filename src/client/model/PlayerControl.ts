import { EventEmitter } from '#event-emitter';
import { Collection } from '../../shared/Collection.ts';
import { gamepadListener } from '../gamepadListener.ts';
import { GamepadMapper } from '../lib/GamepadMapper.js';
import { KeyboardMapper } from '../lib/KeyboardMapper.js';
import { TouchMapper } from '../lib/TouchMapper.js';

/**
 * Player control
 */
export class PlayerControl extends EventEmitter {
    icon: any;
    listening: boolean;
    mappers: Collection;
    mapper: any;

    constructor(value: any, icon: any) {
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
     */
    addMapper(id: string, mapper: any) {
        const control = this;

        mapper.id = id;

        mapper.on('change', function () {
            return control.setMapper(mapper);
        });
        mapper.on('listening:stop', this.stop);

        this.mappers.add(mapper);
    }

    /**
     * Set mapper
     */
    setMapper(mapper: any) {
        this.mapper = mapper;
        this.emit('change');
    }

    /**
     * Get mapping
     */
    getMapping() {
        return {
            mapper: this.mapper.id,
            value: this.mapper.value
        };
    }

    /**
     * Load mapping
     */
    loadMapping(mapping: any) {
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
