/** How a game is scored and when it is over: the settings of a room that both server and client know */

/** The ways to score a game: the classic one, and Star Chase with its missions */
export const scoringModes = ['classic', 'starchase'] as const;
export type ScoringModeId = (typeof scoringModes)[number];

/**
 * Feature toggle for the modes that are still in development: a disabled mode is hidden from the
 * room settings and rejected by the server, the room stays in the classic one.
 * Flip a mode here to publish it, or set the `ENABLED_SCORING_MODES` environment variable
 * (comma-separated, e.g. `classic,starchase`) to override the list at runtime.
 */
export const enabledScoringModes: readonly ScoringModeId[] = ['classic'];

/** The runtime override, set by the server at launch (from the environment) and by the page at runtime (from `server:info`) */
let runtimeModes: readonly ScoringModeId[] | null = null;

/**
 * Override the enabled modes. Unknown ids are dropped; an empty list keeps the default.
 * Called by the server at launch (`ENABLED_SCORING_MODES`) and by the client (`server:info`).
 */
export function setEnabledScoringModes(modes: unknown): void {
    const list = Array.isArray(modes)
        ? modes.filter((mode): mode is ScoringModeId => typeof mode === 'string' && (scoringModes as readonly string[]).includes(mode))
        : [];

    runtimeModes = list.length ? [...new Set(list)] : null;
}

/** The modes that are enabled: the runtime override, or the default */
export function getEnabledScoringModes(): readonly ScoringModeId[] {
    return runtimeModes ?? enabledScoringModes;
}

/** Is this mode ready for players? */
export function isScoringModeEnabled(mode: unknown): boolean {
    return getEnabledScoringModes().includes(mode as ScoringModeId);
}

export const defaultScoringMode: ScoringModeId = 'classic';

/** The ways a game can be over: the first to reach a score, after a number of rounds, or after some time */
export const winConditions = ['points', 'rounds', 'time'] as const;
export type WinConditionId = (typeof winConditions)[number];

export const defaultWinCondition: WinConditionId = 'points';

/** What a game ends with when the master did not choose: Star Chase is made for a fixed number of rounds */
export const defaultWinConditions: Record<ScoringModeId, WinConditionId> = {
    classic: defaultWinCondition,
    starchase: 'rounds'
};

/** The victory score without a choice, per player: the points of Star Chase come faster than the classic ones */
export const defaultScorePerPlayer: Record<ScoringModeId, number> = {
    classic: 10,
    starchase: 6
};

/** Rounds of a game that is played for a number of rounds */
export const defaultRounds = 8;
export const maxRounds = 99;

/** Minutes of a game that is played for some time */
export const defaultMinutes = 15;
export const maxMinutes = 120;

/** In the last rounds before the end of a game, every source of points counts twice */
export const finaleRounds = 2;
export const finaleFactor = 2;

export function isScoringMode(value: unknown): value is ScoringModeId {
    return (scoringModes as readonly unknown[]).includes(value);
}

export function isWinCondition(value: unknown): value is WinConditionId {
    return (winConditions as readonly unknown[]).includes(value);
}

/** Where a round is on the way to the end of the game, sent to the clients when the round starts */
export interface RoundInfo {
    /** Number of the round, 1 for the first */
    round: number;
    /** The game is over after this round (or after the tie break, when the score is tied) */
    last: boolean;
    /** Every source of points counts twice in this round */
    finale: boolean;
    /** The round decides a tie: only the players that are tied score */
    tiebreak: boolean;
}
