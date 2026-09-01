import { EventEmitter } from 'eventemitter3';
import { Collection } from '@shared/Collection.ts';
import { KeyboardMapper, TouchMapper, GamepadMapper, type Mapper } from '../lib/mappers.ts';

/**
 * One rebindable control (left or right). Holds a keyboard / touch / gamepad
 * mapper; the active one is `mapper`, its captured input is `mapper.value`.
 */
export class PlayerControl extends EventEmitter {
  icon: string;
  listening = false;
  mappers = new Collection<Mapper & { id: string }>();
  mapper: Mapper & { id: string };

  constructor(value: number, icon: string) {
    super();
    this.icon = icon;

    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);

    this.addMapper('keyboard', new KeyboardMapper());
    this.addMapper('touch', new TouchMapper());
    this.addMapper('gamepad', new GamepadMapper());

    this.mapper = this.mappers.getById('keyboard')!;
    this.mapper.setValue(value);
  }

  addMapper(id: string, mapper: Mapper): void {
    mapper.id = id;
    mapper.on('change', () => this.setMapper(mapper as Mapper & { id: string }));
    mapper.on('listening:stop', this.stop);
    this.mappers.add(mapper as Mapper & { id: string });
  }

  setMapper(mapper: Mapper & { id: string }): void {
    this.mapper = mapper;
    this.emit('change');
  }

  getMapping(): { mapper: string; value: unknown } {
    return { mapper: this.mapper.id, value: this.mapper.value };
  }

  loadMapping(mapping: { mapper: string; value: unknown }): void {
    const mapper = this.mappers.getById(mapping.mapper);
    if (mapper) {
      this.setMapper(mapper);
      this.mapper.setValue(mapping.value as never);
    }
  }

  toggle(): void {
    if (this.mapper.listening) {
      this.stop();
    } else {
      this.start();
    }
  }

  start(): void {
    for (let i = this.mappers.items.length - 1; i >= 0; i--) {
      this.mappers.items[i]!.start();
    }
  }

  stop(): void {
    for (let i = this.mappers.items.length - 1; i >= 0; i--) {
      this.mappers.items[i]!.stop();
    }
  }
}
