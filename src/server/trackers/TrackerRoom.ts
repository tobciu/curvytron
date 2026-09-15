import { Tracker, type TrackerValues } from './Tracker.ts';
import type { Room } from '../model/Room.ts';

/** Tracks one room: how many games it has hosted. */
export class TrackerRoom extends Tracker {
  room: Room;
  games = 0;

  constructor(room: Room) {
    super(room.name);
    this.room = room;

    this.onGame = this.onGame.bind(this);
    this.room.on('game:new', this.onGame);
  }

  onGame(): void {
    this.games++;
  }

  override destroy(): this {
    this.room.removeListener('game:new', this.onGame);
    return super.destroy();
  }

  override getValues(): TrackerValues {
    return { ...super.getValues(), games: this.games };
  }
}
