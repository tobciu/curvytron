/** "No player", "1 player", "3 players" */
export function pluralizePlayers(count: number): string {
    if (count === 0) {
        return 'No player';
    }

    return count === 1 ? '1 player' : `${count} players`;
}
