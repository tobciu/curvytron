import type { Avatar } from '../model/Avatar.ts';
import type { Game } from '../model/Game.ts';
import type { Bonus } from '../model/Bonus/Bonus.ts';
import { metrics } from './Metrics.ts';
import type { Award, GameStatsData, PlayerStats } from '../../shared/model/GameStats.ts';

/**
 * Between two positions of an avatar, a larger distance is a teleport (borderless, new round)
 */
const maxStep = 5;

/**
 * Awards: the player with the highest value of the field gets it, if it is not a tie and not zero
 */
const awardFields: Record<string, keyof PlayerStats> = {
    bonusHunter: 'bonuses',
    wallLover: 'wallDeaths',
    clumsy: 'selfDeaths',
    closeCall: 'nearMisses',
    hunter: 'kills',
    marathon: 'distance',
    survivor: 'longestLife'
};

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
    /** Avatars that are close to a trail of somebody else right now */
    near: Set<number> = new Set();

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

        for (const avatar of game.avatars.items) {
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
                distance: 0,
                trailLength: 0,
                longestLife: 0
            });

            avatar.on('die', this.onDie);
            avatar.on('position', this.onPosition);
        }

        game.on('game:start', this.onRoundStart);
        game.on('round:end', this.onRoundEnd);
        game.bonusManager.on('bonus:catch', this.onBonusCatch);
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
        this.game.bonusManager?.removeListener('bonus:catch', this.onBonusCatch);
    }

    /**
     * Every round (re)starts the loop: all avatars are on their start position
     */
    onRoundStart() {
        this.roundStart = Date.now();
        this.positions.clear();
        this.near.clear();

        for (const avatar of this.game.avatars.items) {
            this.positions.set(avatar.id, [avatar.x, avatar.y]);
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
        }
    }

    /**
     * Is the avatar passing very close to the trail of another player? Counts every approach once.
     * Called every frame for the avatars that are alive: it is one more look in the islands of the world.
     */
    testNearMiss(avatar: Avatar) {
        const stats = this.players.get(avatar.id);
        const body = avatar.body;

        if (!stats || !body || avatar.invincible) {
            this.near.delete(avatar.id);

            return;
        }

        const radius = body.radius;

        // The avatar did not touch anything in this frame: anything it touches with a larger body was a near miss
        body.radius = radius * (1 + this.nearMargin);

        const hit = this.game.world.getBody(body);

        body.radius = radius;

        if (hit && hit.data !== avatar) {
            if (!this.near.has(avatar.id)) {
                this.near.add(avatar.id);
                stats.nearMisses++;
            }
        } else {
            this.near.delete(avatar.id);
        }
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

        const winner = data.winner ? this.players.get(data.winner.id) : null;

        if (winner) {
            winner.roundsWon++;
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

            if (best && (best[field] as number) > 0 && (sorted.length < 2 || sorted[1][field] !== best[field])) {
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
            awards: this.getAwards()
        };
    }
}
