/**
 * The game modes, for the rules page. A new mode is one more entry here: it gets its own card.
 */
export interface GameMode {
    id: string;
    name: string;
    /** One sentence */
    summary: string;
    /** How points are earned and how the game is won */
    rules: readonly string[];
}

export const gameModes: readonly GameMode[] = [
    {
        id: 'classic',
        name: 'Classic',
        summary: 'Survive longer than the others.',
        rules: [
            'Every player who dies gets as many points as there are players who died before them in that round.',
            'The last one alive wins the round and gets one point for each other player (at least one).',
            'The game ends when a player reaches the score limit and is alone in the lead. The default limit is 10 points for each opponent; the room owner can change it in the room settings.',
            'If several players reach the limit with the same score, the game goes on until one of them is ahead.'
        ]
    },
    {
        id: 'starchase',
        name: 'Star Chase',
        summary: 'Driving well is the base, but missions decide who wins: the result stays open until the last round.',
        rules: [
            'The places in a round give points as in the classic mode.',
            'Every round has missions that everybody sees at the edge of the field, with the standing during the round: one mission with two players, two missions from three, three from ten. The best player of each mission gets points, all of them when tied, nobody when the value is 0.',
            'A mission is worth half the points of a round win (at least one). Nothing counts while a player is invincible.',
            'Small stars appear at risky places, close to the walls or to trails, and go away after a while: a ring around a star shows how long it stays. A star is worth a third of the points of a round win (at least one). There are fewer stars than players: half the players rounded up, at most three.',
            'Between two rounds the recap shows what everybody got: the place, the missions and the total.',
            'By default the game ends after 8 rounds. In the last two rounds, every source of points counts twice. A tied score is decided in a tie break round, in which only the tied players score.',
            'The room owner can also end the game at a score or after some time, in both modes.'
        ]
    }
];
