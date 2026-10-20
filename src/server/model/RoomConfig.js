import { BonusAllColor } from './Bonus/BonusAllColor.js';
import { BonusEnemyBig } from './Bonus/BonusEnemyBig.js';
import { BonusEnemyFast } from './Bonus/BonusEnemyFast.js';
import { BonusEnemyInverse } from './Bonus/BonusEnemyInverse.js';
import { BonusEnemyRandom } from './Bonus/BonusEnemyRandom.js';
import { BonusEnemySlow } from './Bonus/BonusEnemySlow.js';
import { BonusEnemyStraightAngle } from './Bonus/BonusEnemyStraightAngle.js';
import { BonusGameBorderless } from './Bonus/BonusGameBorderless.js';
import { BonusGameClear } from './Bonus/BonusGameClear.js';
import { BonusLeaderFast } from './Bonus/BonusLeaderFast.js';
import { BonusLeaderInverse } from './Bonus/BonusLeaderInverse.js';
import { BonusLeaderRandom } from './Bonus/BonusLeaderRandom.js';
import { BonusLeaderSlow } from './Bonus/BonusLeaderSlow.js';
import { BonusSelfBorderless } from './Bonus/BonusSelfBorderless.js';
import { BonusSelfFast } from './Bonus/BonusSelfFast.js';
import { BonusSelfMaster } from './Bonus/BonusSelfMaster.js';
import { BonusSelfRandom } from './Bonus/BonusSelfRandom.js';
import { BonusSelfSlow } from './Bonus/BonusSelfSlow.js';
import { BonusSelfSmall } from './Bonus/BonusSelfSmall.js';
import { BaseRoomConfig } from '../../shared/model/BaseRoomConfig.js';

/**
 * Room Configuration
 *
 * @param {Room} room
 */
export class RoomConfig extends BaseRoomConfig {
    constructor(room) {
        super(room);
    }

    /**
     * Set open
     *
     * @param {Boolean} open
     */
    setOpen(open) {
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
     *
     * @return {Array}
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

/**
 * Bonus types
 *
 * @type {Array}
 */
RoomConfig.prototype.bonusTypes = {
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
