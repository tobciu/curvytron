/**
 * Room Name Generator
 */
class RoomNameGenerator {
    /**
     * Adjectives
     *
     * @type {Array}
     */
    adjectives = [
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

    nouns = [
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
     *
     * @return {String}
     */
    getName() {
        return 'The ' + this.getAdjective() + ' ' + this.getNoun();
    }

    /**
     * Get random adjective
     *
     * @return {String}
     */
    getAdjective() {
        return this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
    }

    /**
     * Get random noun
     *
     * @return {String}
     */
    getNoun() {
        return this.nouns[Math.floor(Math.random() * this.nouns.length)];
    }
}

export default RoomNameGenerator;
