import { bonusRadius } from '../../shared/bonuses.ts';
import { BonusCoinBronze } from '../model/Bonus/BonusCoinBronze.ts';
import { BonusCoinGold } from '../model/Bonus/BonusCoinGold.ts';
import { BonusCoinSilver } from '../model/Bonus/BonusCoinSilver.ts';
import { randomUnit } from './random.ts';
import { expectedRoundLength, findFreePosition, findRiskyPosition } from './Placement.ts';
import type { BonusCoin } from '../model/Bonus/BonusCoin.ts';
import type { Game } from '../model/Game.ts';

/** How many coins of every kind lie on the map: more for more players, up to a limit */
export interface CoinCounts {
    bronze: number;
    silver: number;
    gold: number;
}

export function coinCounts(players: number): CoinCounts {
    return {
        bronze: Math.min(Math.ceil(players * 1.5), 8),
        silver: Math.min(players, 6),
        gold: Math.min(Math.ceil(players / 2), 4)
    };
}

/** Part of the bronze coins that lie on the map when the round starts, the other coins come one by one */
const startingBronze = 0.6;

type CoinClass = new (x: number, y: number) => BonusCoin;

/**
 * Puts the coins of the coin mission on the map: some bronze coins lie there when the round runs, the others come one by
 * one over the round, in a random order (the gold ones rather late). The more a coin is worth, the more risky is the
 * place: gold lies close to a border or to a trail, silver half of the time, bronze anywhere. A coin stays until somebody
 * catches it or the round is over.
 */
export class CoinSpawner {
    game: Game;
    started: boolean = false;
    coins: BonusCoin[] = [];
    timers: Set<ReturnType<typeof setTimeout>> = new Set();

    constructor(game: Game) {
        this.game = game;
    }

    /** The round is running: the first coins lie on the map and the others are planned (once) */
    begin(players: number) {
        if (this.started || !this.game.inRound || !this.game.bonusManager) {
            return;
        }

        this.started = true;

        const counts = coinCounts(players);
        const atStart = Math.ceil(counts.bronze * startingBronze);
        const later: Array<[CoinClass, number]> = [
            ...Array.from({ length: counts.bronze - atStart }, (): [CoinClass, number] => [BonusCoinBronze, 0]),
            ...Array.from({ length: counts.silver }, (): [CoinClass, number] => [BonusCoinSilver, 0.15]),
            ...Array.from({ length: counts.gold }, (): [CoinClass, number] => [BonusCoinGold, 0.35])
        ];
        const length = expectedRoundLength(this.game);

        for (let index = 0; index < atStart; index++) {
            this.spawn(BonusCoinBronze);
        }

        for (const [Coin, earliest] of later) {
            // A random moment of the round: the more a coin is worth, the later it can come
            const delay = Math.round((earliest + randomUnit() * (0.9 - earliest)) * length);
            const timer = setTimeout(() => {
                this.timers.delete(timer);
                this.spawn(Coin);
            }, delay);

            this.timers.add(timer);
        }
    }

    /** Put a coin on the map, at a place that fits its value */
    spawn(Coin: CoinClass) {
        const game = this.game;

        if (!game.inRound || !game.bonusManager) {
            return;
        }

        const radius = bonusRadius(Coin.name);
        const risky = Coin === BonusCoinGold || (Coin === BonusCoinSilver && randomUnit() < 0.5);
        const [x, y] = risky ? findRiskyPosition(game, radius) : findFreePosition(game, radius);
        const coin = new Coin(x, y);

        this.coins.push(coin);
        game.bonusManager.add(coin);
    }

    /** The round is over: the coins that are left go away, and no new ones come */
    stop() {
        for (const timer of this.timers) {
            clearTimeout(timer);
        }

        this.timers.clear();

        const manager = this.game.bonusManager;

        for (const coin of this.coins) {
            if (manager?.bonuses.exists(coin)) {
                manager.remove(coin);
            }
        }

        this.coins = [];
    }
}
