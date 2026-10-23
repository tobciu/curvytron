import { classicMode } from './ClassicMode.ts';
import { starChaseMode } from './StarChaseMode.ts';
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
    return modes[id] ?? classicMode;
}
