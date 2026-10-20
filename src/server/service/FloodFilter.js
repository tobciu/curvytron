/**
 * Chat flood filter
 *
 * @param {Array} messages
 */
export class FloodFilter {
    constructor(messages) {
        this.messages = messages;
    }

    /**
     * Is message valid?
     *
     * @param {Message} message
     *
     * @return {Boolean}
     */
    isValid(message) {
        const history = this.getClientHistory(message.client.id, new Date().getTime() - this.toleranceRange);

        return history < this.toleranceTotal;
    }

    /**
     * Get client history
     *
     * @param {Number} id
     * @param {Date} maxDate
     *
     * @return {[type]}
     */
    getClientHistory(id, max) {
        let history = 0,
            message;

        for (let i = this.messages.length - 1; i >= 0; i--) {
            message = this.messages[i];

            if (message.client.id === id) {
                history++;
            }

            if (message.creation < max) {
                break;
            }
        }

        return history;
    }
}

/**
 * Number of message allowed
 *
 * @type {Number}
 */
FloodFilter.prototype.toleranceTotal = 3;

/**
 * Range of time for tolerance
 *
 * @type {Number}
 */
FloodFilter.prototype.toleranceRange = 2000;
