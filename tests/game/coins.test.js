import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BonusCoin } from '../../src/server/model/Bonus/BonusCoin.ts';
import { BonusCoinBronze } from '../../src/server/model/Bonus/BonusCoinBronze.ts';
import { BonusCoinGold } from '../../src/server/model/Bonus/BonusCoinGold.ts';
import { BonusCoinSilver } from '../../src/server/model/Bonus/BonusCoinSilver.ts';
import { BonusSelfFast } from '../../src/server/model/Bonus/BonusSelfFast.ts';
import { CoinSpawner, coinCounts } from '../../src/server/scoring/Coins.ts';
import { coinValue, isSpecialBonus } from '../../src/shared/bonuses.ts';
import { createGame, place } from '../helpers/game.js';

let game;
let alice;
let bob;

function setup(names = ['Alice', 'Bob', 'Carl']) {
    ({
        game,
        avatars: [alice, bob]
    } = createGame(names, (config) => config.setMode('starchase')));
    game.avatars.items.forEach((avatar) => avatar.printManager.stop());
}

/** Start the round without its loop, with the missions given */
function startRound(ids) {
    game.start = vi.fn();
    game.newRound();
    game.started = true;
    game.world.activate();
    game.bonusManager.world.activate();

    if (ids) {
        game.missions.ids = ids;
        game.coins = ids.includes('coinHunter') ? new CoinSpawner(game) : null;
    }

    game.emit('game:start', { game });
}

const coinsOnMap = () => game.bonusManager.bonuses.items.filter((bonus) => bonus instanceof BonusCoin);

beforeEach(() => {
    vi.useFakeTimers();
    setup();
});

afterEach(() => {
    game.avatars?.items.forEach((avatar) => avatar.printManager.stop());
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe('the coins', () => {
    it('are worth 1, 2 and 3, and are special bonuses', () => {
        expect(['BonusCoinBronze', 'BonusCoinSilver', 'BonusCoinGold'].map(coinValue)).toEqual([1, 2, 3]);
        expect(coinValue('BonusSelfFast')).toBe(0);
        expect(['BonusCoinBronze', 'BonusStar'].every(isSpecialBonus)).toBe(true);
        expect(isSpecialBonus('BonusSelfFast')).toBe(false);
        expect(game.room.config.bonuses).not.toHaveProperty('BonusCoinGold');
    });

    it('are small, but not as small as the star', () => {
        const coin = new BonusCoinBronze(10, 20);

        expect(coin.body.radius).toBe(2);
    });

    it('grow in number with the players, up to a limit', () => {
        expect([2, 3, 6, 10, 20].map((players) => Object.values(coinCounts(players)))).toEqual([
            [3, 2, 1],
            [5, 3, 2],
            [8, 6, 3],
            [8, 6, 4],
            [8, 6, 4]
        ]);
    });
});

describe('the mission of the coins', () => {
    it('puts some bronze coins on the map when the round runs, and the others come one by one', () => {
        startRound(['coinHunter', 'comeback']);

        expect(coinsOnMap()).toHaveLength(0);

        game.update(16);
        game.update(16);

        const kinds = (Coin) => coinsOnMap().filter((bonus) => bonus instanceof Coin).length;
        const counts = coinCounts(3);
        const atStart = Math.ceil(counts.bronze * 0.6);

        // At the start only bronze lies there
        expect([kinds(BonusCoinBronze), kinds(BonusCoinSilver), kinds(BonusCoinGold)]).toEqual([atStart, 0, 0]);

        // The others come over the round, silver and gold included
        const moments = [];

        game.bonusManager.on('bonus:pop', (bonus) => {
            if (bonus instanceof BonusCoin) {
                moments.push(Date.now());
            }
        });
        vi.advanceTimersByTime(40000);

        expect([kinds(BonusCoinBronze), kinds(BonusCoinSilver), kinds(BonusCoinGold)]).toEqual([
            counts.bronze,
            counts.silver,
            counts.gold
        ]);
        expect(moments).toHaveLength(counts.bronze - atStart + counts.silver + counts.gold);
        expect(new Set(moments).size).toBeGreaterThan(1);
    });

    it('lets the gold come late, not in the first third of the round', () => {
        startRound(['coinHunter', 'comeback']);
        game.update(16);

        const gold = [];

        game.bonusManager.on('bonus:pop', (bonus) => {
            if (bonus instanceof BonusCoinGold) {
                gold.push(Date.now() - start);
            }
        });

        const start = Date.now();

        vi.advanceTimersByTime(40000);

        expect(gold.length).toBe(coinCounts(3).gold);
        // The round length of a first round is 30 s: gold comes after 35 % of it
        expect(Math.min(...gold)).toBeGreaterThanOrEqual(0.35 * 30000 - 1);
    });

    it('has no coins in a round without the mission', () => {
        startRound(['collector', 'comeback']);
        game.update(16);

        expect(game.coins).toBeNull();
        expect(coinsOnMap()).toHaveLength(0);
    });

    it('adds up the value of the coins that are caught, and the best gets the mission', () => {
        startRound(['coinHunter', 'comeback']);

        for (const [Coin, avatar] of [
            [BonusCoinGold, alice],
            [BonusCoinBronze, alice],
            [BonusCoinSilver, bob]
        ]) {
            game.bonusManager.add(new Coin(50, 50));
            place(avatar, 50, 50, 0);
            game.bonusManager.testCatch(avatar);
        }

        expect(game.stats.round.get(alice.id).coins).toBe(4);
        expect(game.stats.round.get(bob.id).coins).toBe(2);
        expect(game.missions.standing('coinHunter').leaders).toEqual([alice.id]);
    });

    it('does not count as a bonus, a sabotage or for the collector, and gives no points of its own', () => {
        startRound(['coinHunter', 'collector']);
        game.bonusManager.add(new BonusCoinGold(50, 50));
        place(alice, 50, 50, 0);
        game.bonusManager.testCatch(alice);

        expect(game.stats.round.get(alice.id).bonuses).toBe(0);
        expect(game.stats.players.get(alice.id).bonuses).toBe(0);
        expect(alice.roundScore).toBe(0);
        expect(game.missions.standing('collector').leaders).toEqual([]);
    });

    it('does not count while the avatar is invincible', () => {
        startRound(['coinHunter', 'comeback']);
        alice.setInvincible(true);
        game.bonusManager.add(new BonusCoinGold(50, 50));
        place(alice, 50, 50, 0);
        game.bonusManager.testCatch(alice);

        expect(game.stats.round.get(alice.id).coins).toBe(0);
    });

    it('takes the coins that are left off the map when the round ends, and no new ones come', () => {
        startRound(['coinHunter', 'comeback']);
        game.update(16);

        expect(coinsOnMap().length).toBeGreaterThan(0);

        place(alice, 99.5, 50, 0);
        place(bob, 99.5, 20, 0);
        game.update(16);

        expect(game.inRound).toBe(false);
        expect(coinsOnMap()).toHaveLength(0);

        vi.advanceTimersByTime(60000);
        expect(coinsOnMap()).toHaveLength(0);
    });

    it('puts the gold close to a border or to a trail', () => {
        startRound(['coinHunter', 'comeback']);
        game.update(16);
        vi.advanceTimersByTime(40000);

        const gold = coinsOnMap().filter((bonus) => bonus instanceof BonusCoinGold);

        expect(gold.length).toBeGreaterThan(0);

        for (const { x, y } of gold) {
            // No trails yet: the gold is at a border
            expect(Math.min(x, y, game.size - x, game.size - y)).toBeLessThanOrEqual(8);
        }
    });

    it('is told to a player that comes in the middle of the round, with the coins', () => {
        startRound(['coinHunter', 'comeback']);
        game.update(16);
        vi.advanceTimersByTime(40000);

        const addEvents = vi.fn();

        game.controller.attachSpectator({ addEvents });

        const events = addEvents.mock.calls[0][0];
        const pops = events.filter(([name]) => name === 'bonus:pop').map(([, data]) => data[3]);

        expect(pops.filter((type) => type.startsWith('BonusCoin'))).toHaveLength(coinsOnMap().length);
        // No ring for a coin: it has no lifetime
        expect(events.find(([name, data]) => name === 'bonus:pop' && data[3] === 'BonusCoinGold')[1]).toHaveLength(4);
    });

    it('is not drawn with two players and nothing else is affected: bonuses still count', () => {
        startRound(['coinHunter', 'collector']);
        game.bonusManager.add(new BonusSelfFast(50, 50));
        place(alice, 50, 50, 0);
        game.bonusManager.testCatch(alice);

        expect(game.stats.round.get(alice.id).bonuses).toBe(1);
    });
});
