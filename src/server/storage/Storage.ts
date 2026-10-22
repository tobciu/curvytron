import type { GameResult } from '../../shared/model/GameResult.ts';
import type { StatsQueries } from './queries.ts';

/** How the storage is doing, for `/health` */
export interface StorageStatus {
    /** `ok`: it keeps the games, `off`: disabled, `error`: it could not be opened and the games are not kept */
    state: 'ok' | 'off' | 'error';
    file?: string;
    games?: number;
    error?: string;
}

/**
 * Where the results of the games are kept. The server does not care how: this is all it needs, so that the database
 * can be replaced (and so that everything works without one).
 */
export interface Storage {
    /** Keep the result of a game. It may throw: the caller makes sure that this never disturbs a game. */
    saveGame(result: GameResult): void;
    /** What the statistics ask of the stored games, null when nothing is kept */
    readonly queries: StatsQueries | null;
    status(): StorageStatus;
    close(): void;
}
