/** One entry in the lobby room list. */
export class RoomListItem {
  name: string;
  players: number;
  game: boolean;
  open: boolean;
  password = '';

  constructor(name: string, players: number, game: boolean, open: boolean) {
    this.name = name;
    this.players = players;
    this.game = game;
    this.open = open;
  }

  getUrl(): string {
    return '/room/' + encodeURIComponent(this.name);
  }
}
