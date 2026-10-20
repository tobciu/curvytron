/**
 * Room list item
 */
export class RoomListItem {
    name: any;
    players: any;
    game: any;
    open: any;
    password: string;

    constructor(name: any, players: any, game: any, open: any) {
        this.name = name;
        this.players = players;
        this.game = game;
        this.open = open;
        this.password = '';
    }

    /**
     * Get url
     */
    getUrl(): string {
        return `/room/${encodeURIComponent(this.name)}`;
    }
}
