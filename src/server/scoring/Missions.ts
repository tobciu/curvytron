import { continuousMissions, isMissionAvailable, missionCount, missionIds, missions } from '../../shared/missions.ts';
import type { MissionId, MissionResult, MissionStanding, MissionState } from '../../shared/missions.ts';
import { selectableBonuses } from '../../shared/bonuses.ts';
import type { RoundCounters } from '../../shared/model/GameStats.ts';
import type { Game } from '../model/Game.ts';

const bonusNames = Object.fromEntries(selectableBonuses.map(({ name }) => [name, true]));

/**
 * Draw the missions of a round: the number depends on the players, a mission that makes no sense with so few players
 * is left out, so is one that needs bonuses the room does not have, and the missions of the round before do not come
 * again right away.
 */
export function drawMissions(
    players: number,
    previous: readonly MissionId[] = [],
    random: () => number = Math.random,
    enabledBonuses: readonly string[] = Object.keys(bonusNames),
    hasPreviousRound: boolean = true
): MissionId[] {
    const fits = missionIds.filter(
        (id) =>
            missions[id].minPlayers <= players &&
            isMissionAvailable(id, enabledBonuses) &&
            // Nobody was last in a round that did not happen
            (id !== 'comeback' || hasPreviousRound)
    );
    const fresh = fits.filter((id) => !previous.includes(id));
    const count = missionCount(players);
    const drawn: MissionId[] = [];

    while (drawn.length < count && fresh.length > 0) {
        drawn.push(...fresh.splice(Math.floor(random() * fresh.length), 1));
    }

    // The pool is too small without the missions of the round before: take them back, in their order
    for (const id of fits) {
        if (drawn.length >= count) {
            break;
        }

        if (!drawn.includes(id)) {
            drawn.push(id);
        }
    }

    return drawn;
}

/** The value of a counting mission for one player, capped */
function valueOf(id: MissionId, counters: RoundCounters): number {
    const cap = missions[id].cap ?? Number.POSITIVE_INFINITY;
    const raw = {
        closeCombat: counters.nearMisses,
        needleEye: counters.squeezes,
        collector: counters.bonuses,
        hunter: counters.kills,
        wallRunner: counters.wallTime,
        marathon: counters.distance,
        saboteur: counters.sabotages,
        speedDemon: counters.boostTime,
        gapRunner: counters.gapRuns,
        coinHunter: counters.coins
    }[id as 'closeCombat'];

    return Math.min(Math.round(raw ?? 0), cap);
}

/**
 * The missions of one round. Reads what the players did from the counters of the round (`GameStats`), so the standing
 * during the round and the result at the end are computed in the same way.
 */
export class MissionRound {
    game: Game;
    ids: MissionId[];
    /** The ids of the avatars that take part */
    players: number[];
    /** What was told to the clients last, to tell only what changed */
    sent: Map<MissionId, { text: string; at: number }> = new Map();
    /** The last time the standing was looked at (ms) */
    checkedAt: number = 0;

    constructor(game: Game, ids: MissionId[]) {
        this.game = game;
        this.ids = ids;
        this.players = game.getPresentAvatars().items.map(({ id }) => id);
    }

    /** The players that are still in the game: whoever left does not take part in the missions any more */
    active(): number[] {
        return this.players.filter((id) => this.game.avatars?.getById(id)?.present);
    }

    counters(id: number): RoundCounters | undefined {
        return this.game.stats.round.get(id);
    }

    isAlive(id: number): boolean {
        return this.game.avatars?.getById(id)?.alive === true;
    }

    /** Was the player the last of the round before (with enough players for it to mean something)? */
    wasLast(id: number): boolean {
        const places = this.game.stats.previousPlaces;
        const worst = Math.max(0, ...places.values());

        return places.size >= missions.comeback.minPlayers && places.get(id) === worst;
    }

    /**
     * State of a yes/no mission for a player. `ended`: the round is over, `winner`: who survived it.
     */
    stateOf(id: MissionId, player: number, ended: boolean, winner: number | null): MissionState {
        const counters = this.counters(player);
        const alive = this.isAlive(player);

        if (!counters) {
            return 'missed';
        }

        if (id === 'kamikaze') {
            const first = this.game.stats.deathOrder[0];

            if (first === undefined) {
                return ended ? 'missed' : 'open';
            }

            if (first !== player) {
                return 'missed';
            }

            return counters.kills >= 1 ? 'done' : ended ? 'missed' : 'open';
        }

        if (id === 'comeback') {
            if (!this.wasLast(player)) {
                return 'missed';
            }

            if (ended) {
                return winner === player ? 'done' : 'missed';
            }

            return alive ? 'open' : 'missed';
        }

        return 'missed';
    }

    /** How a mission stands right now */
    standing(id: MissionId, ended = false, winner: number | null = null): MissionStanding {
        if (missions[id].kind === 'count') {
            const values = this.active().map((player): [number, number] => {
                const counters = this.counters(player);

                return [player, counters ? valueOf(id, counters) : 0];
            });
            const best = Math.max(0, ...values.map(([, value]) => value));

            return {
                id,
                leaders: best > 0 ? values.filter(([, value]) => value === best).map(([player]) => player) : [],
                values
            };
        }

        const states = this.active().map((player): [number, MissionState] => [
            player,
            this.stateOf(id, player, ended, winner)
        ]);

        return { id, leaders: states.filter(([, state]) => state === 'done').map(([player]) => player), states };
    }

    standings(): MissionStanding[] {
        return this.ids.map((id) => this.standing(id));
    }

    /**
     * The standings that changed since they were told, to tell them. The ones that count something that goes on all the
     * time (the distance, the time at the wall) are told once per second at most.
     */
    changes(now: number): MissionStanding[] {
        const changed: MissionStanding[] = [];

        for (const standing of this.standings()) {
            const text = JSON.stringify(standing);
            const last = this.sent.get(standing.id);

            if (last?.text === text) {
                continue;
            }

            if (last && continuousMissions.includes(standing.id) && now - last.at < 1000) {
                continue;
            }

            this.sent.set(standing.id, { text, at: now });
            changed.push(standing);
        }

        return changed;
    }

    /** Remember that the clients know the standings (the whole list was sent) */
    markSent(now: number) {
        for (const standing of this.standings()) {
            this.sent.set(standing.id, { text: JSON.stringify(standing), at: now });
        }
    }

    /** Who gets which mission at the end of the round: the best value (all of them when tied), nobody for 0 */
    results(winner: number | null): MissionResult[] {
        return this.ids.map((id) => ({ id, winners: this.standing(id, true, winner).leaders }));
    }
}
