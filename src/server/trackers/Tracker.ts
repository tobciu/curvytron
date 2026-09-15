import { EventEmitter } from 'eventemitter3';
import { md5 } from './md5.ts';

export interface TrackerValues {
  mesuredDuration: number;
  id: string;
  [key: string]: unknown;
}

/**
 * One tracked entity (a client, a room, a game): a duration since creation plus
 * a stable hashed id, reported to the {@link Inspector} when it's destroyed.
 */
export class Tracker extends EventEmitter {
  readonly id: string;
  readonly creation = Date.now();
  readonly uniqId: string;

  constructor(id: string) {
    super();
    this.id = id;
    this.uniqId = md5(`${this.creation}-${id}`);
  }

  destroy(): this {
    return this;
  }

  getDuration(): number {
    return Date.now() - this.creation;
  }

  getValues(): TrackerValues {
    return { mesuredDuration: this.getDuration(), id: this.uniqId };
  }

  getTags(): Record<string, string> {
    return {};
  }
}
