import type { Avatar } from '../model/Avatar.ts';
import type { Feat } from '../../shared/model/GameStats.ts';

/** All the feats, for the texts of the clients (`src/client/content/feats.ts`) */
export const featIds = [
    'cleanSweep',
    'doubleKill',
    'graveKill',
    'revenge',
    'photoFinish',
    'pacifist',
    'badKarma',
    'earlyExit'
] as const;

export type FeatId = (typeof featIds)[number];

/** Two kills this close to each other (ms) are a double kill */
const doubleKillWindow = 1000;

/** The killer has been dead for this long (ms) when it kills: it is not the same frame */
const graveDelay = 300;

/** Dying this soon (ms) after catching a bonus that is bad for you is bad karma */
const karmaWindow = 3000;

/** The bonuses that are a risk for the one who catches them: slower, faster (rocket, harder to steer), angular */
const karmaBonuses = new Set(['BonusSelfSlow', 'BonusSelfFast', 'BonusSelfRandom']);

/** The last players of a round that die this close to each other (ms) died at the same moment */
const photoFinishWindow = 50;

/** First to die in this many rounds in a row */
const earlyExitRounds = 3;

/** With fewer players, a kill is the whole round and everybody is first to die every other round */
const minPlayers = 3;

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
    deaths: Array<{ id: number; time: number }> = [];
    lastKill: Map<number, number> = new Map();
    /** When an avatar caught a bonus that is bad for it */
    badCatches: Map<number, number> = new Map();
    /** Feats of this round that were given already */
    given: Set<string> = new Set();
    /** First to die, rounds in a row */
    firstDeaths: Map<number, number> = new Map();

    start(participants: number[]) {
        this.participants = new Set(participants);
        this.previousKillers = this.killers;
        this.killers = new Map();
        this.kills.clear();
        this.deaths = [];
        this.lastKill.clear();
        this.badCatches.clear();
        this.given.clear();
    }

    /**
     * Somebody died: `killer` is the one whose trail was hit, null for a border, the avatar itself for its own trail
     */
    die(avatar: Avatar, killer: Avatar | null, time: number) {
        this.deaths.push({ id: avatar.id, time });

        const caught = this.badCatches.get(avatar.id);

        if (caught !== undefined && time - caught <= karmaWindow) {
            this.give('badKarma', avatar.id);
        }

        if (killer && killer.id !== avatar.id) {
            this.kill(killer, avatar, time);
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

        if (this.previousKillers.get(killer.id) === victim.id) {
            this.give('revenge', killer.id, victim.id);
        }

        const dead = this.deaths.find(({ id }) => id === killer.id);

        if (dead && time - dead.time >= graveDelay) {
            this.give('graveKill', killer.id);
        }
    }

    catchBonus(avatar: Avatar, type: string, time: number) {
        if (karmaBonuses.has(type)) {
            this.badCatches.set(avatar.id, time);
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

            if (winner && !this.kills.get(winner.id)) {
                this.give('pacifist', winner.id);
            }

            this.endFirstDeaths();
        }

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

    /** Whoever is the first to die, round after round */
    private endFirstDeaths() {
        const first = this.deaths[0]?.id;

        for (const id of this.participants) {
            const streak = id === first ? (this.firstDeaths.get(id) ?? 0) + 1 : 0;

            this.firstDeaths.set(id, streak);

            if (streak > 0 && streak % earlyExitRounds === 0) {
                this.give('earlyExit', id);
            }
        }
    }

    /** Give the feat to a player, once per round (and once per other player) */
    private give(id: FeatId, player: number, other?: number) {
        const key = `${id}:${player}:${other ?? ''}`;

        if (this.given.has(key)) {
            return;
        }

        this.given.add(key);
        this.feats.push({ id, player, round: this.rounds + 1, ...(other === undefined ? {} : { other }) });
    }
}
