/**
 * Message
 *
 * @param {Number} creation
 */
export class Message {
    /**
     * Message type
     *
     * @type {String}
     */
    type = 'default';

    /**
     * Default color
     *
     * @type {String}
     */
    static anonymousColor = '#75858c';

    static anonymousName = 'Anonymous';

    static maxLength = 140;

    color = Message.anonymousColor;

    /**
     * Default name
     *
     * @type {String}
     */
    name = Message.anonymousName;

    /**
     * Default icon
     *
     * @type {String}
     */
    icon = null;

    /**
     * Message max length
     *
     * @type {Number}
     */
    maxLength = Message.maxLength;

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
