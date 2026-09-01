import { BasePlayer } from '@shared/model/BasePlayer.ts';
import { Avatar } from './Avatar.ts';

/** Server player — uses the server Avatar; serialize carries the client's active flag. */
export class Player extends BasePlayer {
  static override AvatarClass = Avatar;

  override serialize() {
    const data = super.serialize();
    return { ...data, active: (this.client as { active?: boolean }).active };
  }
}
