/**
 * Message
 *
 * @param {String} content
 * @param {SocketClient} client
 */
export class Message {
    constructor(client, content) {
        this.client = client;
        this.content = content;
        this.creation = new Date();
        this.name = null;
        this.color = null;

        this.buildPlayer();
    }

    /**
     * Build player
     */
    buildPlayer() {
        const player = this.client.players.getFirst();

        if (player) {
            this.name = player.name;
            this.color = player.color;
        }
    }

    /**
     * Serialize
     *
     * @return {Object}
     */
    serialize() {
        if (this.name === null) {
            this.buildPlayer();
        }

        return {
            client: this.client.id,
            content: this.content,
            creation: this.creation.getTime(),
            name: this.name,
            color: this.color
        };
    }
}

/**
 * Message max length
 *
 * @type {Number}
 */
Message.prototype.maxLength = 140;
