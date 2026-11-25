import type { Avatar } from '../model/Avatar.ts';
import type { Feat } from '../../shared/model/GameStats.ts';

/** All the feats, for the texts of the clients (`src/client/content/feats.ts`) */
export const featIds = [
    'cleanSweep',
    'doubleKill',
    'revenge',
    'photoFinish',
    'mutualKill',
    'cutoff',
    'pacifist',
    'badKarma',
    'earlyExit',
    'timesUp',
    'bonusRush',
    'daredevil',
    'rookieMistake',
    'wallRider',
    'whitewash'
] as const;

export type FeatId = (typeof featIds)[number];

/** Two kills this close to each other (ms) are a double kill */
const doubleKillWindow = 1000;

/** The killer has been dead for this long (ms) when it kills: it is not the same frame */
const graveDelay = 300;

/** Dying this soon (ms) after catching a bonus that is bad for you is bad karma */
const karmaWindow = 2000;

/** The bonuses that are a risk for the one who catches them: faster (the rocket) is harder to steer, angular too */
const karmaBonuses = new Set(['BonusSelfFast', 'BonusSelfRandom']);

/** The last players of a round that die this close to each other (ms) died at the same moment */
const photoFinishWindow = 250;

/** Two players that die on each other's trail this close together (ms) killed each other at the same moment */
const mutualKillWindow = 250;

/** Dying this soon (ms) after somebody died on this avatar's trail or at the border is a cut off */
const cutoffWindow = 1500;

/** How close (units) the giver and the victim must be at the moment of the victim's death */
const cutoffDistance = 30;

/** Dying this soon (ms) after the invincibility ended is no luck, it is bad timing */
const timesUpWindow = 500;

/** This many bonuses within this much time (ms) */
const bonusRushCount = 3;
const bonusRushWindow = 4000;

/** This many close calls within this much time (ms) */
const daredevilCount = 3;
const daredevilWindow = 3000;

/** Dying on your own, this soon (ms) after the start of the round */
const rookieWindow = 5000;

/** Staying this long (ms) close to a border, closer than this many radii */
const wallRiderTime = 4000;
const wallRiderRadii = 6;

/** Is the avatar close to a border (the distance feats and missions call wall riding)? */
export function isNearWall(avatar: Avatar, size: number): boolean {
    return Math.min(avatar.x, avatar.y, size - avatar.x, size - avatar.y) <= avatar.radius * wallRiderRadii;
}

/** A game without a lost round needs at least this many rounds */
const whitewashRounds = 3;

/** First to die in this many rounds in a row: the fewer the players, the more rounds, as it is easier to be the first */
function earlyExitRounds(players: number): number {
    return Math.max(3, 8 - players);
}

/** With fewer players, a kill is the whole round and everybody is first to die every other round */
const minPlayers = 3;

/** With fewer players than this, a revenge is too easy: there are not enough players to get lost between */
const revengePlayers = 5;

/**
 * Special feats: things that happen in a round and are not counted by the statistics. They are hidden: nobody tells
 * what they are, the players see them when they happen, at the end of the round and of the game.
 *
 * `GameStats` tells what happens (a round starts, somebody dies, catches a bonus, the round ends), the feats are in
 * `feats`, with the number of the round.
 */
export class Feats {
    feats: Feat[] = [];

    /** Rounds that were finished: the number of the running round is one more */
    rounds: number = 0;

    /** Avatars that take part in the round, and the kills they made */
    participants: Set<number> = new Set();
    kills: Map<number, number> = new Map();
    /** Who killed whom with a trail in this round, and in the round before: victim => killer */
    killers: Map<number, number> = new Map();
    previousKillers: Map<number, number> = new Map();
    /** When (ms since the start of the round) the avatars died, in the order of the deaths */
    deaths: Array<{ id: number; time: number; killer: number | null; distances: Map<number, number> }> = [];
    lastKill: Map<number, number> = new Map();
    /** When an avatar caught a bonus that is bad for it */
    badCatches: Map<number, number> = new Map();
    /** The winner of the last round that was won without a kill, null when the last round was not like this */
    lastPacifist: number | null = null;
    /** Feats of this round that were given already */
    given: Set<string> = new Set();
    /** First to die, rounds in a row */
    firstDeaths: Map<number, number> = new Map();
    /** When (ms since the start of the round) the invincibility of an avatar ended */
    invincibleEnds: Map<number, number> = new Map();
    /** When the avatars caught their last bonuses, and made their last close calls */
    recentCatches: Map<number, number[]> = new Map();
    recentNearMisses: Map<number, number[]> = new Map();
    /** Since when (ms since the start of the round) an avatar is close to a border */
    wallSince: Map<number, number> = new Map();

    start(participants: number[]) {
        this.participants = new Set(participants);
        this.previousKillers = this.killers;
        this.killers = new Map();
        this.kills.clear();
        this.deaths = [];
        this.lastKill.clear();
        this.badCatches.clear();
        this.given.clear();
        this.invincibleEnds.clear();
        this.recentCatches.clear();
        this.recentNearMisses.clear();
        this.wallSince.clear();
    }

    /**
     * Somebody died: `killer` is the one whose trail was hit, null for a border, the avatar itself for its own trail.
     * `positions` is the position of every participant at the moment of the death, which is used to check that the
     * giver and the victim are close together (the cut off).
     */
    die(avatar: Avatar, killer: Avatar | null, time: number, positions: Map<number, [number, number]> = new Map()) {
        const distances = new Map<number, number>();

        for (const [id, [x, y]] of positions) {
            if (id !== avatar.id) {
                distances.set(id, Math.hypot(x - avatar.x, y - avatar.y));
            }
        }

        this.deaths.push({ id: avatar.id, time, killer: killer?.id ?? null, distances });

        const caught = this.badCatches.get(avatar.id);

        if (caught !== undefined && time - caught <= karmaWindow) {
            this.give('badKarma', avatar.id);
        }

        const ended = this.invincibleEnds.get(avatar.id);

        if (ended !== undefined && time - ended <= timesUpWindow) {
            this.give('timesUp', avatar.id);
        }

        if (killer && killer.id !== avatar.id) {
            this.kill(killer, avatar, time);
        } else if (time <= rookieWindow) {
            // A border or the own trail, right at the start
            this.give('rookieMistake', avatar.id);
        }

        this.endCutoffs(avatar, time);
    }

    /**
     * Cut someone off the way: they died on this avatar's trail or at the border, and this avatar died shortly after
     */
    private endCutoffs(avatar: Avatar, time: number) {
        for (const death of this.deaths) {
            if (death.id === avatar.id || time - death.time > cutoffWindow) {
                continue;
            }

            // The victim died on this avatar's trail (the trail of the avatar) or on a border of the game
            if (death.killer !== avatar.id && death.killer !== null) {
                continue;
            }

            // The giver and the victim must be close together at the moment of the victim's death
            const distance = death.distances.get(avatar.id);

            if (distance === undefined || distance > cutoffDistance) {
                continue;
            }

            this.give('cutoff', avatar.id, death.id);
        }
    }

    private kill(killer: Avatar, victim: Avatar, time: number) {
        this.kills.set(killer.id, (this.kills.get(killer.id) ?? 0) + 1);
        this.killers.set(victim.id, killer.id);

        const last = this.lastKill.get(killer.id);

        if (last !== undefined && time - last <= doubleKillWindow) {
            this.give('doubleKill', killer.id);
        }

        this.lastKill.set(killer.id, time);

        if (this.participants.size >= revengePlayers && this.previousKillers.get(killer.id) === victim.id) {
            this.give('revenge', killer.id, victim.id);
        }
    }

    /**
     * Did the killer die already (and not in the same moment)? Its trail is still there and kills the others: it is no
     * feat but a number of the statistics, call it before `die` counts the death of the victim
     */
    isGraveKill(killer: Avatar, time: number): boolean {
        const dead = this.deaths.find(({ id }) => id === killer.id);

        return dead !== undefined && time - dead.time >= graveDelay;
    }

    catchBonus(avatar: Avatar, type: string, time: number) {
        if (karmaBonuses.has(type)) {
            this.badCatches.set(avatar.id, time);
        }

        if (this.within(this.recentCatches, avatar.id, time, bonusRushWindow) >= bonusRushCount) {
            this.give('bonusRush', avatar.id);
        }
    }

    /** The avatar passed very close to the trail of somebody else */
    nearMiss(id: number, time: number) {
        if (this.within(this.recentNearMisses, id, time, daredevilWindow) >= daredevilCount) {
            this.give('daredevil', id);
        }
    }

    /** The invincibility of an avatar is over (the Master bonus ran out) */
    invincibleEnd(avatar: Avatar, time: number) {
        this.invincibleEnds.set(avatar.id, time);
    }

    /**
     * Where the avatar is: close to a border for long enough is a feat. Not when the borders are no danger.
     */
    position(avatar: Avatar, size: number, safe: boolean, time: number) {
        if (safe || !isNearWall(avatar, size)) {
            this.wallSince.delete(avatar.id);

            return;
        }

        const since = this.wallSince.get(avatar.id) ?? time;

        this.wallSince.set(avatar.id, since);

        if (time - since >= wallRiderTime) {
            this.give('wallRider', avatar.id);
        }
    }

    /** Adds the time to the times of the avatar and returns how many are not older than the window */
    private within(times: Map<number, number[]>, id: number, time: number, window: number): number {
        const recent = (times.get(id) ?? []).filter((previous) => time - previous <= window);

        recent.push(time);
        times.set(id, recent);

        return recent.length;
    }

    /**
     * The game is over: the winner won every round, and there were enough of them to be worth saying
     */
    gameOver(winner: number, roundsWon: number) {
        if (this.rounds >= whitewashRounds && roundsWon === this.rounds) {
            this.give('whitewash', winner, undefined, this.rounds);
        }
    }

    /**
     * The round is over: the feats that need the whole round
     */
    end(winner: Avatar | null) {
        const players = this.participants.size;

        if (players >= minPlayers) {
            for (const [id, kills] of this.kills) {
                if (kills >= players - 1) {
                    this.give('cleanSweep', id);
                }
            }

            this.endPacifist(winner);

            this.endFirstDeaths();
        }

        if (players < minPlayers) {
            this.lastPacifist = null;
        }

        this.endMutualKills();

        if (!winner && this.deaths.length >= 2) {
            const last = Math.max(...this.deaths.map(({ time }) => time));
            const together = this.deaths.filter(({ time }) => last - time <= photoFinishWindow);

            if (together.length >= 2) {
                for (const { id } of together) {
                    this.give('photoFinish', id);
                }
            }
        }

        this.rounds++;
    }

    /** Winning without a kill: it takes a streak of two rounds in a row */
    private endPacifist(winner: Avatar | null) {
        if (!winner || this.kills.get(winner.id)) {
            this.lastPacifist = null;

            return;
        }

        if (this.lastPacifist === winner.id) {
            this.give('pacifist', winner.id);
        }

        this.lastPacifist = winner.id;
    }

    /** Two players that die on each other's trail at the same moment killed each other */
    private endMutualKills() {
        for (const { id: a, time: timeA } of this.deaths) {
            for (const { id: b, time: timeB } of this.deaths) {
                if (a === b || Math.abs(timeA - timeB) > mutualKillWindow) {
                    continue;
                }

                if (this.killers.get(a) !== b || this.killers.get(b) !== a) {
                    continue;
                }

                this.give('mutualKill', a, b);
                this.give('mutualKill', b, a);
            }
        }
    }

    /** Whoever is the first to die, round after round */
    private endFirstDeaths() {
        const first = this.deaths[0]?.id;

        for (const id of this.participants) {
            const streak = id === first ? (this.firstDeaths.get(id) ?? 0) + 1 : 0;

            this.firstDeaths.set(id, streak);

            if (streak > 0 && streak % earlyExitRounds(this.participants.size) === 0) {
                this.give('earlyExit', id);
            }
        }
    }

    /** Give the feat to a player, once per round (and once per other player) */
    private give(id: FeatId, player: number, other?: number, round: number = this.rounds + 1) {
        const key = `${id}:${player}:${other ?? ''}`;

        if (this.given.has(key)) {
            return;
        }

        this.given.add(key);
        this.feats.push({ id, player, round, ...(other === undefined ? {} : { other }) });
    }
}
