import type { Avatar } from '../model/Avatar.ts';
import type { Game } from '../model/Game.ts';
import type { Bonus } from '../model/Bonus/Bonus.ts';
import { metrics } from './Metrics.ts';
import { Body } from '../core/Body.ts';
import { World } from '../core/World.ts';
import type { Award, GameStatsData, PlayerStats, RoundResult } from '../../shared/model/GameStats.ts';

/**
 * Between two positions of an avatar, a larger distance is a teleport (borderless, new round)
 */
const maxStep = 5;

/**
 * Awards: the player with the highest value of the field gets it, if it is not a tie and not zero
 */
export const awardFields: Record<string, keyof PlayerStats> = {
    bonusHunter: 'bonuses',
    wallLover: 'wallDeaths',
    clumsy: 'selfDeaths',
    closeCall: 'nearMisses',
    needle: 'squeezes',
    gapRunner: 'gapRuns',
    hunter: 'kills',
    marathon: 'distance',
    survivor: 'longestLife',
    streak: 'longestStreak'
};

/**
 * Awards that need more than one: a streak of one round is no streak
 */
const awardMinimum: Record<string, number> = { streak: 2 };

/**
 * Game statistics
 *
 * Counts what happens in a game from its events, so that the players can compare themselves after the game.
 * Nothing is computed per tick except the distance, which is a single addition per avatar.
 */
export class GameStats {
    game: Game;
    players: Map<number, PlayerStats> = new Map();
    positions: Map<number, [number, number]> = new Map();
    roundStart: number = 0;
    rounds: RoundResult[] = [];
    /** Avatars that are close to a trail of somebody else right now */
    near: Set<number> = new Set();
    /** Avatars that are between two trails right now, or going through a trail while invincible */
    squeezing: Set<number> = new Set();
    /**
     * The gaps in the trails: while an avatar does not print, it leaves invisible bodies behind it, in a world of their own
     * (they do not kill). Going through the gap of somebody else counts once per gap.
     */
    gaps: World | null = null;
    /** Number of the gap an avatar is leaving right now */
    openGaps: Map<number, number> = new Map();
    /** Where the last body of the gap of an avatar is */
    lastGapPoint: Map<number, [number, number]> = new Map();
    /** Rounds in a row that an avatar has won right now */
    streaks: Map<number, number> = new Map();
    /** Last number given to a gap */
    gapCount: number = 0;
    /** The gaps an avatar went through already */
    crossedGaps: Map<number, Set<number>> = new Map();
    /** Looks at the left and at the right of an avatar */
    probe: Body = new Body(0, 0, 0);

    /**
     * An avatar is close to a trail when it would touch it with a radius this much larger (times the radius)
     */
    nearMargin: number = 0.5;

    constructor(game: Game) {
        this.game = game;

        this.onRoundStart = this.onRoundStart.bind(this);
        this.onRoundEnd = this.onRoundEnd.bind(this);
        this.onDie = this.onDie.bind(this);
        this.onPosition = this.onPosition.bind(this);
        this.onBonusCatch = this.onBonusCatch.bind(this);
        this.onClear = this.onClear.bind(this);

        for (const avatar of game.avatars.items) {
            this.addAvatar(avatar);
        }

        game.on('game:start', this.onRoundStart);
        game.on('round:end', this.onRoundEnd);
        game.on('clear', this.onClear);
        game.bonusManager.on('bonus:catch', this.onBonusCatch);
    }

    /**
     * Count the statistics of an avatar
     */
    addAvatar(avatar: Avatar) {
        this.players.set(avatar.id, {
            id: avatar.id,
            name: avatar.name,
            color: avatar.color,
            score: 0,
            roundsWon: 0,
            bonuses: 0,
            bonusesByType: {},
            wallDeaths: 0,
            selfDeaths: 0,
            trailDeaths: 0,
            kills: 0,
            nearMisses: 0,
            squeezes: 0,
            gapRuns: 0,
            longestStreak: 0,
            distance: 0,
            trailLength: 0,
            longestLife: 0
        });

        avatar.on('die', this.onDie);
        avatar.on('position', this.onPosition);
    }

    /**
     * Stop listening
     */
    destroy() {
        for (const avatar of this.game.avatars?.items ?? []) {
            avatar.removeListener('die', this.onDie);
            avatar.removeListener('position', this.onPosition);
        }

        this.game.removeListener('game:start', this.onRoundStart);
        this.game.removeListener('round:end', this.onRoundEnd);
        this.game.removeListener('clear', this.onClear);
        this.game.bonusManager?.removeListener('bonus:catch', this.onBonusCatch);
    }

    /**
     * Every round (re)starts the loop: all avatars are on their start position
     */
    onRoundStart() {
        this.roundStart = Date.now();
        this.positions.clear();
        this.near.clear();
        this.squeezing.clear();
        this.onClear();

        for (const avatar of this.game.avatars.items) {
            this.positions.set(avatar.id, [avatar.x, avatar.y]);
        }
    }

    /**
     * The trails are gone (new round, clear bonus): so are the gaps
     */
    onClear() {
        this.gaps = new World(this.game.size);
        this.gaps.activate();
        this.openGaps.clear();
        this.lastGapPoint.clear();
        this.crossedGaps.clear();
    }

    /**
     * An avatar that is not printing leaves a gap: a line of bodies, one per radius or so. Not while it is invincible:
     * the bonus makes a long gap that would be a gift to the others.
     */
    trackGap(avatar: Avatar) {
        if (!this.gaps || avatar.printing || avatar.invincible) {
            this.openGaps.delete(avatar.id);
            this.lastGapPoint.delete(avatar.id);

            return;
        }

        let gap = this.openGaps.get(avatar.id);

        if (gap === undefined) {
            gap = ++this.gapCount;
            this.openGaps.set(avatar.id, gap);
        }

        const last = this.lastGapPoint.get(avatar.id);

        if (!last || Math.hypot(avatar.x - last[0], avatar.y - last[1]) >= avatar.radius) {
            this.gaps.addBody(new Body(avatar.x, avatar.y, avatar.radius, { avatar, gap }));
            this.lastGapPoint.set(avatar.id, [avatar.x, avatar.y]);
        }
    }

    /**
     * Is the avatar in a gap of somebody else? Counted once per gap. Looks at the bodies of one island only.
     */
    testGaps(avatar: Avatar, stats: PlayerStats) {
        const island = this.gaps?.getIslandByPoint(avatar.x, avatar.y);

        if (!island) {
            return;
        }

        let crossed = this.crossedGaps.get(avatar.id);

        for (const body of island.bodies.items as Body[]) {
            const { avatar: owner, gap } = body.data as { avatar: Avatar; gap: number };

            if (owner.id === avatar.id || crossed?.has(gap)) {
                continue;
            }

            if (Math.hypot(body.x - avatar.x, body.y - avatar.y) < body.radius + avatar.radius) {
                crossed ??= new Set();
                crossed.add(gap);
                this.crossedGaps.set(avatar.id, crossed);
                stats.gapRuns++;
            }
        }
    }

    onPosition(avatar: Avatar) {
        const stats = this.players.get(avatar.id);
        const last = this.positions.get(avatar.id);

        if (stats && last && avatar.alive) {
            const distance = Math.hypot(avatar.x - last[0], avatar.y - last[1]);

            if (distance < maxStep) {
                stats.distance += distance;

                if (avatar.printing) {
                    stats.trailLength += distance;
                }
            }

            last[0] = avatar.x;
            last[1] = avatar.y;
            this.trackGap(avatar);
        }
    }

    /**
     * What is around the avatar? Looks at the world three times at most, once per frame for the avatars that are alive:
     * near misses (a trail of somebody else is close) and squeezes (trails of others on both sides), not for the invincible
     * avatars. Every approach is counted once.
     */
    testSurroundings(avatar: Avatar) {
        const stats = this.players.get(avatar.id);
        const body = avatar.body;

        if (!stats || !body) {
            return;
        }

        const radius = body.radius;

        // Nothing counts while the avatar is invincible: it would be too easy, and it takes no courage
        if (avatar.invincible) {
            this.near.delete(avatar.id);
            this.squeezing.delete(avatar.id);

            return;
        }

        this.testGaps(avatar, stats);

        // The avatar did not touch anything in this frame: anything it touches with a larger body was a near miss
        body.radius = radius * (1 + this.nearMargin);

        const hit = this.game.world.getBody(body);

        body.radius = radius;

        const near = this.isForeign(hit, avatar);

        if (near) {
            this.startCount(this.near, stats, 'nearMisses');
        } else {
            this.stopCount(this.near, stats);
        }

        // Trails on both sides: only worth a look when something is close
        const squeezed = near && this.isBetweenTrails(avatar);

        if (squeezed) {
            this.startCount(this.squeezing, stats, 'squeezes');
        } else {
            this.stopCount(this.squeezing, stats);
        }
    }

    /**
     * Is there a trail of somebody else on the left and on the right of the avatar, a bit further than its own body?
     */
    isBetweenTrails(avatar: Avatar): boolean {
        const radius = avatar.radius;
        const distance = radius * 3;
        const probe = this.probe;

        probe.radius = radius;

        for (const side of [-1, 1]) {
            probe.x = avatar.x + Math.cos(avatar.angle + (side * Math.PI) / 2) * distance;
            probe.y = avatar.y + Math.sin(avatar.angle + (side * Math.PI) / 2) * distance;

            if (!this.isForeign(this.game.world.getBody(probe), avatar)) {
                return false;
            }
        }

        return true;
    }

    /** Is it a part of the trail of somebody else? */
    isForeign(hit: Body | null, avatar: Avatar): boolean {
        return hit !== null && hit.data !== avatar;
    }

    /** The condition became true: count the field once and remember it */
    startCount(set: Set<number>, stats: PlayerStats, field: 'nearMisses' | 'squeezes') {
        if (!set.has(stats.id)) {
            set.add(stats.id);
            stats[field]++;
        }
    }

    /** The condition is over: forget it so the next one counts again */
    stopCount(set: Set<number>, stats: PlayerStats) {
        set.delete(stats.id);
    }

    onDie(data: { avatar: Avatar; killer: Avatar | null }) {
        const stats = this.players.get(data.avatar.id);

        if (!stats) {
            return;
        }

        stats.longestLife = Math.max(stats.longestLife, Date.now() - this.roundStart);

        if (!data.killer) {
            metrics.deaths.inc({ cause: 'wall' });
            stats.wallDeaths++;
        } else if (data.killer.id === data.avatar.id) {
            metrics.deaths.inc({ cause: 'self' });
            stats.selfDeaths++;
        } else {
            metrics.deaths.inc({ cause: 'trail' });
            stats.trailDeaths++;

            const killer = this.players.get(data.killer.id);

            if (killer) {
                killer.kills++;
            }
        }
    }

    onBonusCatch(data: { bonus: Bonus; avatar: Avatar }) {
        const stats = this.players.get(data.avatar.id);

        if (stats) {
            const type = data.bonus.constructor.name;

            metrics.bonuses.inc({ type });
            stats.bonuses++;
            stats.bonusesByType[type] = (stats.bonusesByType[type] ?? 0) + 1;
        }
    }

    /**
     * The winner of a round survived until the end
     */
    onRoundEnd(data: { winner: Avatar | null }) {
        const duration = Date.now() - this.roundStart;

        for (const avatar of this.game.avatars.items) {
            const stats = this.players.get(avatar.id);

            if (stats) {
                stats.score = avatar.score;

                if (avatar.alive) {
                    stats.longestLife = Math.max(stats.longestLife, duration);
                }
            }
        }

        this.rounds.push({ round: this.rounds.length + 1, winner: data.winner?.id ?? null, duration });

        const winner = data.winner ? this.players.get(data.winner.id) : null;

        if (winner) {
            winner.roundsWon++;
        }

        // A round that nobody wins, or that somebody else wins, ends the streak
        for (const stats of this.players.values()) {
            const streak = stats === winner ? (this.streaks.get(stats.id) ?? 0) + 1 : 0;

            this.streaks.set(stats.id, streak);
            stats.longestStreak = Math.max(stats.longestStreak, streak);
        }
    }

    /**
     * Awards of the game so far
     */
    getAwards(): Award[] {
        const awards: Award[] = [];
        const players = [...this.players.values()];

        for (const [id, field] of Object.entries(awardFields)) {
            const sorted = players.toSorted((a, b) => (b[field] as number) - (a[field] as number));
            const best = sorted[0];

            if (
                best &&
                (best[field] as number) >= (awardMinimum[id] ?? 1) &&
                (sorted.length < 2 || sorted[1][field] !== best[field])
            ) {
                awards.push({ id, player: best.id, value: Math.round(best[field] as number) });
            }
        }

        return awards;
    }

    /**
     * Serializable results, sent to the clients and ready to be stored
     */
    serialize(): GameStatsData {
        return {
            players: [...this.players.values()].map((stats) => ({
                ...stats,
                distance: Math.round(stats.distance),
                trailLength: Math.round(stats.trailLength)
            })),
            awards: this.getAwards(),
            rounds: this.rounds
        };
    }
}
