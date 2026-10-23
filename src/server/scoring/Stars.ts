import { BonusStar } from '../model/Bonus/BonusStar.ts';
import { bonusRadius } from '../../shared/bonuses.ts';
import { expectedRoundLength, findRiskyPosition } from './Placement.ts';
import type { Game } from '../model/Game.ts';

/** A star lives at least this long (ms), longer on a larger map */
export const minStarLifetime = 10000;

/**
 * Stars per round: half the players, rounded up, at most 3 (5 from ten players on)
 */
export function starCount(players: number): number {
    return Math.min(Math.ceil(players / 2), players >= 10 ? 5 : 3);
}

/**
 * How long a star stays on the map (ms): 10 s on the map of two players, in proportion to the size of the map
 */
export function starLifetime(size: number, sizeForTwo: number): number {
    return Math.round(minStarLifetime * Math.max(size / sizeForTwo, 1));
}

/**
 * Makes the stars of a round appear, spread over the round, at places that are a risk: close to a border or to a trail.
 */
export class StarSpawner {
    game: Game;
    timers: Set<ReturnType<typeof setTimeout>> = new Set();
    started: boolean = false;
    /** Stars of this round that were on the map */
    stars: BonusStar[] = [];

    constructor(game: Game) {
        this.game = game;
    }

    /** The round is running: plan the stars (once) */
    begin(players: number) {
        if (this.started) {
            return;
        }

        this.started = true;

        const count = starCount(players);
        const length = expectedRoundLength(this.game);

        for (let index = 0; index < count; index++) {
            // One star in every part of the round, not at the very start nor the end
            const delay = Math.round(((index + 0.2 + Math.random() * 0.6) / count) * length * 0.9);
            const timer = setTimeout(() => {
                this.timers.delete(timer);
                this.spawn();
            }, delay);

            this.timers.add(timer);
        }
    }

    /** Put a star on the map */
    spawn() {
        const game = this.game;

        if (!game.inRound || !game.bonusManager) {
            return;
        }

        const lifetime = starLifetime(game.size, game.getSize(2));
        const [x, y] = this.pickPosition();
        const star = new BonusStar(x, y);

        star.lifetime = lifetime;
        star.expiresAt = Date.now() + lifetime;
        star.expiry = setTimeout(() => game.bonusManager?.remove(star), lifetime);
        this.stars.push(star);
        game.bonusManager.add(star);
    }

    /** A free position close to a border or to a trail */
    pickPosition(): [number, number] {
        return findRiskyPosition(this.game, bonusRadius('BonusStar'));
    }

    /** Take a star off the map, unless it is not on it any more (caught or expired) */
    remove(star: BonusStar) {
        const manager = this.game.bonusManager;

        if (manager?.bonuses.exists(star)) {
            manager.remove(star);
        }
    }

    /** The round is over: the stars that are left go away, nothing new comes */
    stop() {
        for (const timer of this.timers) {
            clearTimeout(timer);
        }

        this.timers.clear();

        for (const star of this.stars) {
            this.remove(star);
        }

        this.stars = [];
    }
}
