/**
 * Room Name Generator
 */
export class RoomNameGenerator {
    /**
     * Adjectives
     */
    adjectives: any[] = [
        'awesome',
        'amazing',
        'great',
        'fantastic',
        'super',
        'admirable',
        'famous',
        'fine',
        'gigantic',
        'grand',
        'marvelous',
        'mighty',
        'outstanding',
        'splendid',
        'wonderful',
        'big',
        'super',
        'smashing',
        'sensational'
    ];

    nouns: any[] = [
        'game',
        'adventure',
        'fun zone',
        'arena',
        'party',
        'tournament',
        'league',
        'gala',
        'gathering',
        'bunch',
        'fight',
        'battle',
        'conflict',
        'encounter',
        'clash',
        'combat',
        'confrontation',
        'challenge'
    ];

    /**
     * Get random name
     */
    getName(): string {
        return `The ${this.getAdjective()} ${this.getNoun()}`;
    }

    /**
     * Get random adjective
     */
    getAdjective(): string {
        return this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
    }

    /**
     * Get random noun
     */
    getNoun(): string {
        return this.nouns[Math.floor(Math.random() * this.nouns.length)];
    }
}
