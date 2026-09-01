import { Collection } from '@shared/Collection.ts';

/** A remote client seen in a room (its players, active flag, master flag). */
export class Client {
  id: string | number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  players = new Collection<any>();
  active: boolean;
  master = false;

  constructor(id: string | number, active?: boolean) {
    this.id = id;
    this.active = typeof active === 'undefined' || active;
  }

  setMaster(master: boolean): void {
    this.master = master;
  }
}
