/**
 * Print Manager
 */
export class PrintManager {
    avatar: any;
    active: boolean;
    lastX: any;
    lastY: any;
    distance: any;

    /**
     * Hole distance
     */
    holeDistance: number = 5;

    /**
     * Print distance
     */
    printDistance: number = 60;

    constructor(avatar: any) {
        this.avatar = avatar;
        this.active = false;
        this.lastX = 0;
        this.lastY = 0;
        this.distance = 0;

        this.start = this.start.bind(this);
    }

    /**
     * Toggle print
     */
    togglePrinting() {
        this.setPrinting(!this.avatar.printing);
    }

    /**
     * Set print
     */
    setPrinting(printing: any) {
        this.avatar.setPrinting(printing);
        this.distance = this.getRandomDistance();
    }

    /**
     * Get random printing time
     */
    getRandomDistance(): number {
        if (this.avatar.printing) {
            return this.printDistance * (0.3 + Math.random() * 0.7);
        } else {
            return this.holeDistance * (0.8 + Math.random() * 0.5);
        }
    }

    /**
     * Start
     */
    start() {
        if (!this.active) {
            this.active = true;
            this.lastX = this.avatar.x;
            this.lastY = this.avatar.y;
            this.setPrinting(true);
        }
    }

    /**
     * Stop
     */
    stop() {
        if (this.active) {
            this.active = false;
            this.setPrinting(false);
            this.clear();
        }
    }

    /**
     * Test
     */
    test() {
        if (this.active) {
            this.distance -= this.getDistance(this.lastX, this.lastY, this.avatar.x, this.avatar.y);

            this.lastX = this.avatar.x;
            this.lastY = this.avatar.y;

            if (this.distance <= 0) {
                this.togglePrinting();
            }
        }
    }

    /**
     * Get distance
     */
    getDistance(fromX: number, fromY: number, toX: number, toY: number): number {
        return Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
    }

    /**
     * Clear
     */
    clear() {
        this.active = false;
        this.distance = 0;
        this.lastX = 0;
        this.lastY = 0;
    }
}
