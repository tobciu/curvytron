import { bonusRadius } from '../../shared/bonuses.ts';
import { BonusCoinBronze } from '../model/Bonus/BonusCoinBronze.ts';
import { BonusCoinGold } from '../model/Bonus/BonusCoinGold.ts';
import { BonusCoinSilver } from '../model/Bonus/BonusCoinSilver.ts';
import { findFreePosition, findRiskyPosition } from './Placement.ts';
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

/**
 * Puts the coins of the coin mission on the map when the round runs: the more a coin is worth, the more risky is the
 * place. Gold lies close to a border or to a trail, silver half of the time, bronze anywhere. They stay until somebody
 * catches them or the round is over.
 */
export class CoinSpawner {
    game: Game;
    started: boolean = false;
    coins: BonusCoin[] = [];

    constructor(game: Game) {
        this.game = game;
    }

    /** The round is running: put the coins on the map (once) */
    begin(players: number) {
        if (this.started || !this.game.inRound || !this.game.bonusManager) {
            return;
        }

        this.started = true;

        const counts = coinCounts(players);
        const kinds: Array<[new (x: number, y: number) => BonusCoin, number, () => boolean]> = [
            [BonusCoinGold, counts.gold, () => true],
            [BonusCoinSilver, counts.silver, () => Math.random() < 0.5],
            [BonusCoinBronze, counts.bronze, () => false]
        ];

        for (const [Coin, count, risky] of kinds) {
            const radius = bonusRadius(Coin.name);

            for (let index = 0; index < count; index++) {
                const [x, y] = risky() ? findRiskyPosition(this.game, radius) : findFreePosition(this.game, radius);
                const coin = new Coin(x, y);

                this.coins.push(coin);
                this.game.bonusManager.add(coin);
            }
        }
    }

    /** The round is over: the coins that are left go away */
    stop() {
        const manager = this.game.bonusManager;

        for (const coin of this.coins) {
            if (manager?.bonuses.exists(coin)) {
                manager.remove(coin);
            }
        }

        this.coins = [];
    }
}
