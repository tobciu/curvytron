import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BonusSelfFast } from '../../src/server/model/Bonus/BonusSelfFast.ts';
import { BonusEnemyBig } from '../../src/server/model/Bonus/BonusEnemyBig.ts';
import { createGame, place } from '../helpers/game.js';

let game;
let alice;
let bob;
let carl;

function startRound() {
    game.newRound();
    game.started = true;
    game.world.activate();
    game.bonusManager.world.activate();
    // What the loop does after the countdown
    game.emit('game:start', { game });
}

const stats = (avatar) => game.stats.serialize().players.find((player) => player.id === avatar.id);

beforeEach(() => {
    vi.useFakeTimers();
    ({
        game,
        avatars: [alice, bob, carl]
    } = createGame());
    game.avatars.items.forEach((avatar) => avatar.printManager.stop());
});

afterEach(() => {
    game.avatars?.items.forEach((avatar) => avatar.printManager.stop());
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe('game statistics', () => {
    it('starts with a line per player, all at zero', () => {
        const { players, awards } = game.stats.serialize();

        expect(players.map((player) => player.name).toSorted()).toEqual(['Alice', 'Bob', 'Carl']);
        expect(players.every((player) => player.bonuses === 0 && player.distance === 0 && player.kills === 0)).toBe(
            true
        );
        expect(awards).toEqual([]);
    });

    it('counts the bonuses an avatar catches, per type', () => {
        startRound();

        for (const Bonus of [BonusSelfFast, BonusSelfFast, BonusEnemyBig]) {
            const bonus = new Bonus(50, 50);

            game.bonusManager.add(bonus);
            place(alice, 50, 50, 0);
            game.bonusManager.testCatch(alice);
        }

        expect(stats(alice).bonuses).toBe(3);
        expect(stats(alice).bonusesByType).toEqual({ BonusSelfFast: 2, BonusEnemyBig: 1 });
        expect(stats(bob).bonuses).toBe(0);
    });

    it('tells the deaths on a border from the deaths on a trail', () => {
        startRound();
        place(alice, 99.5, 50, 0);
        game.update(16);

        expect(stats(alice).wallDeaths).toBe(1);

        alice.emit('die', { avatar: bob, killer: bob, old: false });
        alice.emit('die', { avatar: bob, killer: carl, old: false });
        bob.emit('die', { avatar: bob, killer: carl, old: false });

        expect(stats(bob)).toMatchObject({ selfDeaths: 1, trailDeaths: 2, wallDeaths: 0 });
        expect(stats(carl).kills).toBe(2);
        expect(stats(bob).kills).toBe(0);
    });

    it('adds up the distance, and the trail length only while printing', () => {
        startRound();
        place(alice, 20, 20, 0);
        game.emit('game:start', { game });

        alice.setPrinting(false);
        alice.setPosition(21, 20);
        alice.setPrinting(true);
        alice.setPosition(22, 20);
        alice.setPosition(22, 23);

        expect(stats(alice).distance).toBe(5);
        expect(stats(alice).trailLength).toBe(4);
    });

    it('ignores a teleport, as the borderless mode does', () => {
        startRound();
        place(alice, 99, 50, 0);
        game.emit('game:start', { game });
        alice.setPosition(0, 50);
        alice.setPosition(1, 50);

        expect(stats(alice).distance).toBe(1);
    });

    it('measures how long an avatar stayed alive in the round', () => {
        startRound();
        vi.setSystemTime(Date.now() + 4000);
        place(alice, 99.5, 50, 0);
        game.update(16);

        expect(stats(alice).longestLife).toBe(4000);
    });

    it('counts the rounds won and keeps the score', () => {
        startRound();
        place(alice, 99.5, 50, 0);
        place(bob, 99.5, 20, 0);
        place(carl, 50, 50, 1);
        game.update(16);

        expect(game.inRound).toBe(false);
        expect(stats(carl)).toMatchObject({ roundsWon: 1, score: 2 });
        expect(stats(alice).roundsWon).toBe(0);
    });

    it('gives an award to the best player, unless it is a tie or nobody did it', () => {
        startRound();
        game.bonusManager.add(new BonusSelfFast(50, 50));
        place(alice, 50, 50, 0);
        game.bonusManager.testCatch(alice);
        // A tie for the kills: no award
        carl.emit('die', { avatar: carl, killer: alice, old: false });
        bob.emit('die', { avatar: bob, killer: carl, old: false });

        const awards = game.stats.getAwards();

        expect(awards).toContainEqual({ id: 'bonusHunter', player: alice.id, value: 1 });
        expect(awards.find((award) => award.id === 'hunter')).toBeUndefined();
        expect(awards.find((award) => award.id === 'wallLover')).toBeUndefined();
    });

    it('sends the statistics to the clients when a round ends', () => {
        const sent = [];

        game.controller.socketGroup.addEvent = (name, data) => sent.push([name, data]);
        startRound();
        place(alice, 99.5, 50, 0);
        place(bob, 99.5, 20, 0);
        place(carl, 50, 50, 1);
        game.update(16);

        const event = sent.find(([name]) => name === 'game:stats');

        expect(event).toBeDefined();
        expect(event[1].players.find((player) => player.id === carl.id).roundsWon).toBe(1);
    });

    it('stops listening when the game ends', () => {
        const avatar = alice;

        game.stats.destroy();
        avatar.emit('die', { avatar, killer: null, old: null });

        expect(stats(alice).wallDeaths).toBe(0);
    });
});
