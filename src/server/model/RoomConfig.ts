import { bonusTypes } from './Bonus/index.ts';
import { BaseRoomConfig } from '../../shared/model/BaseRoomConfig.ts';

/**
 * Room Configuration
 */
export class RoomConfig extends BaseRoomConfig {
    /**
     * Bonus types
     */
    bonusTypes: any = bonusTypes;

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
