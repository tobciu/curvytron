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
        summary: 'Survive longer than the others. The only mode for now.',
        rules: [
            'Every player who dies gets as many points as there are players who died before them in that round.',
            'The last one alive wins the round and gets one point for each other player (at least one).',
            'The game ends when a player reaches the score limit and is alone in the lead. The default limit is 10 points for each opponent; the room owner can change it in the room settings.',
            'If several players reach the limit with the same score, the game goes on until one of them is ahead.'
        ]
    }
];
