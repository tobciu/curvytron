import { BaseRoom } from '@shared/model/BaseRoom.ts';
import type { BasePlayer } from '@shared/model/BasePlayer.ts';
import { RoomConfig } from './RoomConfig.ts';
import { Game } from './Game.ts';
import { RoomController } from '../controller/RoomController.ts';

/** Server room: owns a RoomController and emits join/leave/close for the lobby. */
export class Room extends BaseRoom {
  static override RoomConfigClass = RoomConfig;
  static override GameClass = Game;

  controller: RoomController;

  constructor(name: string) {
    super(name);
    this.controller = new RoomController(this);
  }

  close(): void {
    this.emit('close', { room: this });
  }

  override addPlayer(player: BasePlayer): boolean {
    const result = super.addPlayer(player);
    if (result) {
      this.emit('player:join', { room: this, player });
    }
    return result;
  }

  override removePlayer(player: BasePlayer): boolean {
    const result = super.removePlayer(player);
    if (result) {
      this.emit('player:leave', { room: this, player });
    }
    return result;
  }
}
