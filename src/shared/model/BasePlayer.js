import EventEmitter from 'tom32i-event-emitter.js';

/**
 * BasePlayer
 */
class BasePlayer extends EventEmitter {
    constructor(client, name, color, ready) {
        super();

        this.client = client;
        this.name = name;
        this.color = typeof(color) !== 'undefined' && this.validateColor(color) ? color : this.getRandomColor();
        this.ready = typeof(ready) !== 'undefined' && ready;
        this.id = null;
    }

    /**
     * Max length for name
     *
     * @type {Number}
     */
    maxLength = 25;

    /**
     * Max length for color
     *
     * @type {Number}
     */
    colorMaxLength = 20;

    /**
     * Set name
     *
     * @param {String} name
     */
    setName(name) {
        this.name = name;
    }

    /**
     * Set name
     *
     * @param {String} name
     */
    setColor(color) {
        if (!this.validateColor(color, true)) { return false; }

        this.color = color;

        return true;
    }

    /**
     * Equal
     *
     * @param {Player} player
     *
     * @return {Boolean}
     */
    equal(player) {
        return this.id === player.id;
    }

    /**
     * Toggle Ready
     *
     * @param {Boolean} toggle
     */
    toggleReady(toggle) {
        this.ready = typeof(toggle) !== 'undefined' ? (toggle ? true : false) : !this.ready;
    }

    /**
     * Reset player after a game
     */
    reset() {
        this.ready = false;
    }

    /**
     * Serialize
     *
     * @return {Object}
     */
    serialize() {
        return {
            client: this.client.id,
            id: this.id,
            name: this.name,
            color: this.color,
            ready: this.ready
        };
    }

    /**
     * Get random Color
     *
     * @return {String}
     */
    getRandomColor() {
        let color = '';
        const randomNum = function () { return Math.ceil(Math.random() * 255).toString(16); };

        while (!this.validateColor(color, true)) {
            color = '#' + randomNum() + randomNum() + randomNum();
        }

        return color;
    }

    /**
     * Validate color
     *
     * @param {String} color
     *
     * @return {Boolean}
     */
    validateColor(color, yiq) {
        if (typeof(color) !== 'string') { return false; }

        const matches = color.match(new RegExp('^#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$'));

        if (matches && yiq) {
            const ratio = ((parseInt(matches[1], 16) * 0.4) + (parseInt(matches[2], 16) * 0.5) + (parseInt(matches[3], 16) * 0.3)) / 255;

            return ratio > 0.3;
        }

        return matches ? true : false;
    }
}

export default BasePlayer;
