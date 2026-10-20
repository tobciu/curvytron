import { BonusAllColor } from './Bonus/BonusAllColor.ts';
import { BonusEnemyBig } from './Bonus/BonusEnemyBig.ts';
import { BonusEnemyFast } from './Bonus/BonusEnemyFast.ts';
import { BonusEnemyInverse } from './Bonus/BonusEnemyInverse.ts';
import { BonusEnemyRandom } from './Bonus/BonusEnemyRandom.ts';
import { BonusEnemySlow } from './Bonus/BonusEnemySlow.ts';
import { BonusEnemyStraightAngle } from './Bonus/BonusEnemyStraightAngle.ts';
import { BonusGameBorderless } from './Bonus/BonusGameBorderless.ts';
import { BonusGameClear } from './Bonus/BonusGameClear.ts';
import { BonusLeaderFast } from './Bonus/BonusLeaderFast.ts';
import { BonusLeaderInverse } from './Bonus/BonusLeaderInverse.ts';
import { BonusLeaderRandom } from './Bonus/BonusLeaderRandom.ts';
import { BonusLeaderSlow } from './Bonus/BonusLeaderSlow.ts';
import { BonusSelfBorderless } from './Bonus/BonusSelfBorderless.ts';
import { BonusSelfFast } from './Bonus/BonusSelfFast.ts';
import { BonusSelfMaster } from './Bonus/BonusSelfMaster.ts';
import { BonusSelfRandom } from './Bonus/BonusSelfRandom.ts';
import { BonusSelfSlow } from './Bonus/BonusSelfSlow.ts';
import { BonusSelfSmall } from './Bonus/BonusSelfSmall.ts';
import { BaseRoomConfig } from '../../shared/model/BaseRoomConfig.ts';

/**
 * Room Configuration
 */
export class RoomConfig extends BaseRoomConfig {
    /**
     * Bonus types
     */
    bonusTypes: any = {
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
        BonusSelfBorderless
    };

    constructor(room: any) {
        super(room);
    }

    /**
     * Set open
     */
    setOpen(open: boolean) {
        if (this.open !== open) {
            this.open = open;
            this.password = this.open ? null : this.generatePassword();

            this.emit('room:config:open', { room: this.room, open: this.open });

            return true;
        }

        return false;
    }

    /**
     * Get available bonuses
     */
    getBonuses() {
        const bonuses = [];

        for (const bonus in this.bonuses) {
            if (this.bonuses[bonus]) {
                bonuses.push(this.bonusTypes[bonus]);
            }
        }

        return bonuses;
    }
}
