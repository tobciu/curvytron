/** The missions of Star Chase, for the display during the round and the recap. A new mission is one more entry here. */
import type { MissionId } from '../../shared/missions';

export interface MissionInfo {
    name: string;
    /** What the best player is: "has the most near misses" */
    description: string;
    /** How a value of the mission is written */
    format?: (value: number) => string;
}

export const missionInfo: Record<MissionId, MissionInfo> = {
    closeCombat: { name: 'Close combat', description: 'Most near misses' },
    needleEye: { name: 'Needle’s eye', description: 'Most squeezes between two trails' },
    collector: { name: 'Collector', description: 'Most bonuses caught' },
    hunter: { name: 'Hunter', description: 'Most kills on your own trail' },
    wallRunner: {
        name: 'Wall runner',
        description: 'Longest time close to the wall',
        format: (value) => `${(value / 1000).toFixed(1)} s`
    },
    marathon: { name: 'Marathon', description: 'Longest distance', format: (value) => String(Math.round(value)) },
    kamikaze: { name: 'Kamikaze', description: 'Die first, and take somebody with you' },
    comeback: { name: 'Comeback', description: 'Win the round after being last in the round before' },
    saboteur: { name: 'Saboteur', description: 'Most bonuses caught that harm everybody else' },
    speedDemon: {
        name: 'Speed demon',
        description: 'Most time with your own speed-ups, two at once count twice',
        format: (value) => `${(value / 1000).toFixed(1)} s`
    },
    gapRunner: { name: 'Gap runner', description: 'Most gaps in the trails of others driven through' },
    coinHunter: { name: 'Coin hunter', description: 'Most coins collected: bronze is worth 1, silver 2, gold 3' }
};

/** How a state of a yes / no mission is written */
export const missionStateText = { open: 'open', done: 'done', missed: 'missed' } as const;
