import { BaseTrail } from '../../shared/model/BaseTrail.ts';

/**
 * Trail
 */
export class Trail extends BaseTrail {
    clearAsked: boolean;
    queueX: any;
    queueY: any;

    /**
     * Distance tolerance
     */
    tolerance: number = 1;

    constructor(avatar: any) {
        super(avatar);

        this.clearAsked = false;
        this.queueX = null;
        this.queueY = null;
    }

    /**
     * Get last segment
     */
    getLastSegment() {
        const length = this.points.length;
        let points = null;

        if (length) {
            points = this.points.slice(0);

            if (this.clearAsked) {
                super.clear();
                if (this.queueX !== null) {
                    super.addPoint(this.queueX, this.queueY);
                    this.queueX = null;
                    this.queueY = null;
                }
                this.clearAsked = false;
            } else if (length > 1) {
                this.points.splice(0, length - 1);
            }
        }

        return points;
    }

    /**
     * Add point
     */
    addPoint(x: number, y: number) {
        if (
            this.lastX !== null &&
            (Math.abs(this.lastX - x) > this.tolerance || Math.abs((this.lastY as number) - y) > this.tolerance)
        ) {
            this.clear();
            this.queueX = x;
            this.queueY = y;
        } else {
            super.addPoint(x, y);
        }
    }

    /**
     * Clear
     */
    clear() {
        this.clearAsked = true;
    }
}
