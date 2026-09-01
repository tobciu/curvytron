interface FloodMessage {
  client: { id: string | number };
  creation: Date;
}

/** Rejects a client's message if they've sent >= toleranceTotal within toleranceRange ms. */
export class FloodFilter {
  static readonly toleranceTotal = 3;
  static readonly toleranceRange = 2000;

  constructor(private readonly messages: FloodMessage[]) {}

  isValid(message: FloodMessage): boolean {
    const history = this.getClientHistory(
      message.client.id,
      new Date().getTime() - FloodFilter.toleranceRange,
    );
    return history < FloodFilter.toleranceTotal;
  }

  getClientHistory(id: string | number, max: number): number {
    let history = 0;

    for (let i = this.messages.length - 1; i >= 0; i--) {
      const message = this.messages[i]!;

      if (message.client.id === id) {
        history++;
      }

      if (message.creation.getTime() < max) {
        break;
      }
    }

    return history;
  }
}
