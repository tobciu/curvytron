import type { Avatar } from '../model/Avatar.ts';
import type { Bonus } from '../model/Bonus/Bonus.ts';
import type { Game } from '../model/Game.ts';
import type { ScoringModeId } from '../../shared/scoring.ts';

/**
 * How points are given. The game asks the mode whenever something happens that can be worth points; the mode gives them
 * with `game.award`, which knows about the finale and the tie break. When a game is over is not decided here (see
 * `WinCondition`).
 */
export interface ScoringMode {
    id: ScoringModeId;
    /** Time (ms) between the end of a round and the next one */
    warmdownTime: number;
    /** A round is prepared (before the countdown) */
    onRoundStart?(game: Game): void;
    /** Every frame of a running round: the mode must be quick */
    onFrame?(game: Game, now: number): void;
    /**
     * How much more often the bonuses against the leader come, 1 for the usual chance: the players behind get help when the
     * game gets one-sided
     */
    leaderBonusFactor?(game: Game): number;
    /** An avatar died: `place` is the number of avatars that died before it, the points of its place in the round */
    onKill(game: Game, avatar: Avatar, place: number): void;
    /** An avatar caught a bonus */
    onBonusCatch(game: Game, avatar: Avatar, bonus: Bonus): void;
    /** The round is over: `winner` is the avatar that is alive, null when nobody is */
    onRoundEnd(game: Game, winner: Avatar | null): void;
}
