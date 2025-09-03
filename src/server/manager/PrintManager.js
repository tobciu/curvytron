/**
 * Print Manager
 */
class PrintManager {
    /**
     * Hole distance
     *
     * @type {Number}
     */
    holeDistance = 5;

    /**
     * Print distance
     *
     * @type {Number}
     */
    printDistance = 60;

    constructor(avatar) {
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
    setPrinting(printing) {
        this.avatar.setPrinting(printing);
        this.distance = this.getRandomDistance();
    }

    /**
     * Get random printing time
     *
     * @return {Number}
     */
    getRandomDistance() {
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
     *
     * @param {Number} fromX
     * @param {Number} fromY
     * @param {Number} toX
     * @param {Number} toY
     *
     * @return {Number}
     */
    getDistance(fromX, fromY, toX, toY) {
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

export default PrintManager;
