/** The missions of a round in Star Chase: what they are, what they are worth, and what the server tells the clients */

export const missionIds = [
    'closeCombat',
    'needleEye',
    'collector',
    'hunter',
    'wallRunner',
    'marathon',
    'kamikaze',
    'comeback',
    'saboteur',
    'speedDemon',
    'gapRunner',
    'coinHunter'
] as const;
export type MissionId = (typeof missionIds)[number];

/** A `count` mission goes to the best value, a `flag` mission to everybody who did it */
export type MissionKind = 'count' | 'flag';

export interface MissionDefinition {
    id: MissionId;
    kind: MissionKind;
    /** A mission that makes no sense with fewer players is not drawn */
    minPlayers: number;
    /** A value counts up to this much in a round, so that it can not be driven up on purpose */
    cap?: number;
}

export const missions: Record<MissionId, MissionDefinition> = {
    closeCombat: { id: 'closeCombat', kind: 'count', minPlayers: 2, cap: 15 },
    needleEye: { id: 'needleEye', kind: 'count', minPlayers: 3, cap: 10 },
    collector: { id: 'collector', kind: 'count', minPlayers: 2, cap: 8 },
    hunter: { id: 'hunter', kind: 'count', minPlayers: 2, cap: 10 },
    // Time close to a border (ms)
    wallRunner: { id: 'wallRunner', kind: 'count', minPlayers: 2, cap: 60000 },
    marathon: { id: 'marathon', kind: 'count', minPlayers: 2 },
    saboteur: { id: 'saboteur', kind: 'count', minPlayers: 2, cap: 6 },
    // Time (ms) with the speed-ups of the player, a second speed-up on top of the first counts twice
    speedDemon: { id: 'speedDemon', kind: 'count', minPlayers: 2, cap: 40000 },
    gapRunner: { id: 'gapRunner', kind: 'count', minPlayers: 2, cap: 8 },
    // The value of the coins caught: the coins are only there in a round that has this mission
    coinHunter: { id: 'coinHunter', kind: 'count', minPlayers: 2, cap: 40 },
    kamikaze: { id: 'kamikaze', kind: 'flag', minPlayers: 3 },
    comeback: { id: 'comeback', kind: 'flag', minPlayers: 3 }
};

/**
 * The bonuses of the others that do harm to every other player. The slow ones are left out: they help whoever they
 * hit. The leader bonuses are left out too: they hit only the player in front, who would get a mission for it.
 */
export const harmfulBonuses: readonly string[] = [
    'BonusEnemyFast',
    'BonusEnemyBig',
    'BonusEnemyInverse',
    'BonusEnemyStraightAngle',
    'BonusEnemyRandom'
];

/** A mission is drawn only if the room has what it needs: the bonuses that are enabled decide */
export function isMissionAvailable(id: MissionId, enabledBonuses: readonly string[]): boolean {
    if (id === 'collector') {
        return enabledBonuses.length > 0;
    }

    if (id === 'speedDemon') {
        return enabledBonuses.includes('BonusSelfFast');
    }

    if (id === 'saboteur') {
        // With one harmful bonus it is too rare to be a goal
        return enabledBonuses.filter((name) => harmfulBonuses.includes(name)).length >= 2;
    }

    return true;
}

/** Missions that count something that goes on all the time: they are told at most once per second */
export const continuousMissions: readonly MissionId[] = ['wallRunner', 'marathon', 'speedDemon'];

/** How many missions a round has: one for two players, three from ten on */
export function missionCount(players: number): number {
    if (players <= 2) {
        return 1;
    }

    return players >= 10 ? 3 : 2;
}

/** Points of a round win for the given number of players */
function roundWin(players: number): number {
    return Math.max(players - 1, 1);
}

/** A mission won is worth half a round win, at least 1 */
export function missionPoints(players: number): number {
    return Math.max(Math.ceil(roundWin(players) / 2), 1);
}

/** A star is worth a third of a round win, at least 1 */
export function starPoints(players: number): number {
    return Math.max(Math.ceil(roundWin(players) / 3), 1);
}

export type MissionState = 'open' | 'done' | 'missed';

/** How a mission stands: the values (`count`) or the states (`flag`) of the players, and who would get it now */
export interface MissionStanding {
    id: MissionId;
    leaders: number[];
    /** `[avatar id, value]`, the values are capped */
    values?: Array<[number, number]>;
    /** `[avatar id, state]` */
    states?: Array<[number, MissionState]>;
}

/** Who got a mission at the end of a round */
export interface MissionResult {
    id: MissionId;
    winners: number[];
}

/** What a player got in a round */
export interface RoundSummaryPlayer {
    id: number;
    /** Points for the place in the round */
    placement: number;
    missions: number;
    stars: number;
    /** All of it, with the finale */
    total: number;
}

export interface RoundSummary {
    missions: MissionResult[];
    players: RoundSummaryPlayer[];
}
