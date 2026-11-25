import { classicMode } from './ClassicMode.ts';
import { starChaseMode } from './StarChaseMode.ts';
import { isScoringModeEnabled } from '../../shared/scoring.ts';
import type { ScoringMode } from './ScoringMode.ts';
import type { ScoringModeId } from '../../shared/scoring.ts';

export type { ScoringMode } from './ScoringMode.ts';
export { winConditions } from './WinCondition.ts';
export type { WinCondition } from './WinCondition.ts';

const modes: Record<ScoringModeId, ScoringMode> = {
    classic: classicMode,
    starchase: starChaseMode
};

export function getScoringMode(id: ScoringModeId): ScoringMode {
    // A mode behind the feature toggle is scored by the classic one
    return isScoringModeEnabled(id) ? modes[id] : classicMode;
}
