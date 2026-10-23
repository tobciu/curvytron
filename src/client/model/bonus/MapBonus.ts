import { BounceIn } from '../../animation/BounceIn.ts';
import { BonusManager } from '../../manager/BonusManager.ts';
import { BaseBonus } from '../../../shared/model/BaseBonus.ts';
import { bonusRadius } from '../../../shared/bonuses.ts';

/**
 * Map Bonus
 */
export class MapBonus extends BaseBonus {
    override id: any;
    asset: any;
    animation: BounceIn;
    changed: boolean;
    drawRadius: number;
    drawWidth: number;
    drawX: number;
    drawY: number;
    /** How long the bonus lives (ms) and when it goes away (local clock), null for a bonus that stays */
    lifetime: number | null = null;
    expiresAt: number | null = null;

    /**
     * Assets
     */
    constructor(id: any, x: any, y: any, type: any, lifetime?: number, remaining?: number) {
        super(x, y);

        this.id = id;
        this.radius = bonusRadius(type);

        if (lifetime !== undefined) {
            this.lifetime = lifetime;
            this.expiresAt = Date.now() + (remaining ?? lifetime);
        }

        this.asset = BonusManager.assets[type];
        this.animation = new BounceIn(300);
        this.changed = true;
        this.drawRadius = 0;
        this.drawWidth = 0;
        this.drawX = 0;
        this.drawY = 0;

        this.update();
    }

    /**
     * How much of the lifetime is left, from 1 to 0 (1 for a bonus that stays)
     */
    getRemaining(now: number = Date.now()): number {
        if (this.lifetime === null || this.expiresAt === null) {
            return 1;
        }

        return Math.min(Math.max((this.expiresAt - now) / this.lifetime, 0), 1);
    }

    /**
     * Update bonus for drawing
     */
    update() {
        // After the bounce the value stays 1: the animation is a polynomial that grows without limit
        this.drawRadius = this.radius * (this.animation.done ? this.animation.target : this.animation.getValue());
        this.drawWidth = this.drawRadius * 2;
        this.drawX = this.x - this.drawRadius;
        this.drawY = this.y - this.drawRadius;
    }
}
