/**
 * Message
 *
 * @param {Number} creation
 */
export class Message {
    constructor(creation) {
        this.id = null;
        this.creation = typeof creation === 'number' ? new Date(creation) : new Date();
        this.date = this.getDate();
    }

    /**
     * Get date to text
     *
     * @return {String}
     */
    getDate() {
        if (!this.creation) {
            return '';
        }

        let hours = this.creation.getHours().toString(),
            minutes = this.creation.getMinutes().toString();

        if (hours.length === 1) {
            hours = `0${hours}`;
        }

        if (minutes.length === 1) {
            minutes = `0${minutes}`;
        }

        return `${hours}:${minutes}`;
    }
}

/**
 * Message type
 *
 * @type {String}
 */
Message.prototype.type = 'default';

/**
 * Default color
 *
 * @type {String}
 */
Message.prototype.color = '#75858c';

/**
 * Default name
 *
 * @type {String}
 */
Message.prototype.name = 'Anonymous';

/**
 * Default icon
 *
 * @type {String}
 */
Message.prototype.icon = null;

/**
 * Message max length
 *
 * @type {Number}
 */
Message.prototype.maxLength = 140;
