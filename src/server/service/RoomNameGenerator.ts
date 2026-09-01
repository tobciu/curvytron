/** Generates room names like "The gigantic tournament". */
export class RoomNameGenerator {
  readonly adjectives = [
    'awesome', 'amazing', 'great', 'fantastic', 'super', 'admirable', 'famous', 'fine',
    'gigantic', 'grand', 'marvelous', 'mighty', 'outstanding', 'splendid', 'wonderful',
    'big', 'super', 'smashing', 'sensational',
  ];

  readonly nouns = [
    'game', 'adventure', 'fun zone', 'arena', 'party', 'tournament', 'league', 'gala',
    'gathering', 'bunch', 'fight', 'battle', 'conflict', 'encounter', 'clash', 'combat',
    'confrontation', 'challenge',
  ];

  getName(): string {
    return 'The ' + this.getAdjective() + ' ' + this.getNoun();
  }

  getAdjective(): string {
    return this.adjectives[Math.floor(Math.random() * this.adjectives.length)]!;
  }

  getNoun(): string {
    return this.nouns[Math.floor(Math.random() * this.nouns.length)]!;
  }
}
