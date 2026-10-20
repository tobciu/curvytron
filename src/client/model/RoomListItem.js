/**
 * Room list item
 *
 * @param {String} name
 * @param {Number} players
 * @param {Boolean} game
 * @param {Boolean} open
 */
export class RoomListItem {
    constructor(name, players, game, open) {
        this.name = name;
        this.players = players;
        this.game = game;
        this.open = open;
        this.password = '';
    }

    /**
     * Get url
     *
     * @return {String}
     */
    getUrl() {
        return `/room/${encodeURIComponent(this.name)}`;
    }
}
