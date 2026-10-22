/**
 * Room list item
 */
export class RoomListItem {
    name: any;
    players: any;
    game: any;
    open: any;
    password: string;
    /** Groups the games of the room ("daily"), set when it was created */
    tag: string | null;

    constructor(name: any, players: any, game: any, open: any, tag: string | null = null) {
        this.name = name;
        this.players = players;
        this.game = game;
        this.open = open;
        this.password = '';
        this.tag = tag;
    }

    /**
     * Get url
     */
    getUrl(): string {
        return `/room/${encodeURIComponent(this.name)}`;
    }
}
