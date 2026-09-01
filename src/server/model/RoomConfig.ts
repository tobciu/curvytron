import { BaseRoomConfig } from '@shared/model/BaseRoomConfig.ts';
import type { ServerBonusClass } from '../manager/BonusManager.ts';

import { BonusSelfSmall } from './Bonus/BonusSelfSmall.ts';
import { BonusSelfSlow } from './Bonus/BonusSelfSlow.ts';
import { BonusSelfFast } from './Bonus/BonusSelfFast.ts';
import { BonusSelfMaster } from './Bonus/BonusSelfMaster.ts';
import { BonusSelfBorderless } from './Bonus/BonusSelfBorderless.ts';
import { BonusSelfRandom } from './Bonus/BonusSelfRandom.ts';
import { BonusEnemySlow } from './Bonus/BonusEnemySlow.ts';
import { BonusEnemyFast } from './Bonus/BonusEnemyFast.ts';
import { BonusEnemyBig } from './Bonus/BonusEnemyBig.ts';
import { BonusEnemyInverse } from './Bonus/BonusEnemyInverse.ts';
import { BonusEnemyStraightAngle } from './Bonus/BonusEnemyStraightAngle.ts';
import { BonusEnemyRandom } from './Bonus/BonusEnemyRandom.ts';
import { BonusLeaderFast } from './Bonus/BonusLeaderFast.ts';
import { BonusLeaderInverse } from './Bonus/BonusLeaderInverse.ts';
import { BonusLeaderSlow } from './Bonus/BonusLeaderSlow.ts';
import { BonusLeaderRandom } from './Bonus/BonusLeaderRandom.ts';
import { BonusGameBorderless } from './Bonus/BonusGameBorderless.ts';
import { BonusGameClear } from './Bonus/BonusGameClear.ts';
import { BonusAllColor } from './Bonus/BonusAllColor.ts';

/** Server room config: knows the bonus classes, generates a password when private. */
export class RoomConfig extends BaseRoomConfig {
  readonly bonusTypes: Record<string, ServerBonusClass> = {
    BonusSelfSmall,
    BonusSelfSlow,
    BonusSelfFast,
    BonusSelfMaster,
    BonusEnemySlow,
    BonusEnemyFast,
    BonusEnemyBig,
    BonusEnemyInverse,
    BonusGameBorderless,
    BonusAllColor,
    BonusGameClear,
    BonusEnemyStraightAngle,
    BonusSelfRandom,
    BonusLeaderRandom,
    BonusEnemyRandom,
    BonusLeaderFast,
    BonusLeaderInverse,
    BonusLeaderSlow,
    BonusSelfBorderless,
  } as unknown as Record<string, ServerBonusClass>;

  setOpen(open: boolean): boolean {
    if (this.open !== open) {
      this.open = open;
      this.password = this.open ? null : this.generatePassword();
      this.emit('room:config:open', { room: this.room, open: this.open });
      return true;
    }
    return false;
  }

  /** Server override: returns the bonus *classes* for the enabled bonuses. */
  override getBonuses(): unknown[] {
    const bonuses: ServerBonusClass[] = [];
    for (const bonus in this.bonuses) {
      if (this.bonuses[bonus] && this.bonusTypes[bonus]) {
        bonuses.push(this.bonusTypes[bonus]!);
      }
    }
    // typed as string[] on the base for BaseGame's sake; the array actually holds classes.
    return bonuses;
  }
}
