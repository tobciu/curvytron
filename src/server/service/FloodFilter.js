/**
 * Chat flood filter
 */
class FloodFilter {
    /**
     * Number of message allowed
     *
     * @type {Number}
     */
    toleranceTotal = 3;

    /**
     * Range of time for tolerance
     *
     * @type {Number}
     */
    toleranceRange = 2000;

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
        let history = 0;

        for (let i = this.messages.length - 1; i >= 0; i--) {
            const message = this.messages[i];

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

export default FloodFilter;
