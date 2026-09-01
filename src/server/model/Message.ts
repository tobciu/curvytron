interface MessageClient {
  id: string | number;
  players: { getFirst(): { name: string; color: string } | null };
}

/** A chat message; `buildPlayer` snapshots the sender's name/colour. */
export class Message {
  static readonly maxLength = 140;

  client: MessageClient;
  content: string;
  id: number | null = null;
  creation = new Date();
  name: string | null = null;
  color: string | null = null;

  constructor(client: MessageClient, content: string) {
    this.client = client;
    this.content = content;
    this.buildPlayer();
  }

  buildPlayer(): void {
    const player = this.client.players.getFirst();
    if (player) {
      this.name = player.name;
      this.color = player.color;
    }
  }

  serialize(): {
    client: string | number;
    content: string;
    creation: number;
    name: string | null;
    color: string | null;
  } {
    if (this.name === null) {
      this.buildPlayer();
    }

    return {
      client: this.client.id,
      content: this.content,
      creation: this.creation.getTime(),
      name: this.name,
      color: this.color,
    };
  }
}
