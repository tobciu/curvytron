import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BonusSelfFast } from '../../src/server/model/Bonus/BonusSelfFast.ts';
import { AvatarBody } from '../../src/server/core/AvatarBody.ts';
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

        // The avatar may have been placed less than 5 units from where it was: that is already counted
        const raw = game.stats.players.get(alice.id);
        const start = { distance: raw.distance, trailLength: raw.trailLength };

        alice.setPrinting(false);
        alice.setPosition(21, 20);
        alice.setPrinting(true);
        alice.setPosition(22, 20);
        alice.setPosition(22, 23);

        expect(raw.distance - start.distance).toBeCloseTo(5);
        expect(raw.trailLength - start.trailLength).toBeCloseTo(4);
    });

    it('ignores a teleport, as the borderless mode does', () => {
        startRound();
        place(alice, 99, 50, 0);
        game.emit('game:start', { game });

        const raw = game.stats.players.get(alice.id);
        const start = raw.distance;

        alice.setPosition(0, 50);
        alice.setPosition(1, 50);

        expect(raw.distance - start).toBeCloseTo(1);
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

describe('near misses', () => {
    /** Alice drives past a body of Bob's trail, at the given distance (she moves 0.26 away in the frame) */
    function pass(distance) {
        place(alice, 50 + distance, 50, 0);
        game.update(16);
    }

    beforeEach(() => {
        startRound();
        // A body of the trail of Bob
        game.world.addBody(new AvatarBody(50, 50, bob));
        place(bob, 10, 10, 1);
        place(carl, 90, 90, 1);
    });

    it('counts a pass at less than half a radius of a trail, once for the whole approach', () => {
        pass(1.15);
        pass(1.1);
        pass(1.2);

        expect(alice.alive).toBe(true);
        expect(stats(alice).nearMisses).toBe(1);
    });

    it('counts again when the avatar went away and came back', () => {
        pass(1.15);
        pass(5);
        pass(1.15);

        expect(stats(alice).nearMisses).toBe(2);
    });

    it('does not count a pass further away, nor the touch that kills', () => {
        pass(3);
        expect(stats(alice).nearMisses).toBe(0);

        pass(0.5);
        expect(alice.alive).toBe(false);
        expect(stats(alice).nearMisses).toBe(0);
    });

    it('does not count the own trail, nor an invincible avatar', () => {
        game.world.addBody(new AvatarBody(20, 20, alice));
        alice.bodyCount += 10;
        place(alice, 21.15, 20, 0);
        game.update(16);

        expect(stats(alice).nearMisses).toBe(0);

        alice.setInvincible(true);
        pass(1.15);

        expect(stats(alice).nearMisses).toBe(0);
    });

    it('gives an award to the closest driver', () => {
        pass(1.15);

        expect(game.stats.getAwards()).toContainEqual({ id: 'closeCall', player: alice.id, value: 1 });
    });
});

describe('squeezes and rounds', () => {
    beforeEach(() => {
        startRound();
        place(bob, 10, 10, 1);
        place(carl, 90, 90, 1);
    });

    /** Trails of Bob on both sides of the way of Alice (she goes along x, the sides are on y) */
    function corridor(width) {
        game.world.addBody(new AvatarBody(60.2, 50 - width, bob));
        game.world.addBody(new AvatarBody(60.2, 50 + width, bob));
    }

    it('counts the pass between two trails that are close to each other', () => {
        corridor(1.4);
        place(alice, 60, 50, 0);
        game.update(16);

        expect(alice.alive).toBe(true);
        expect(stats(alice).squeezes).toBe(1);
        expect(stats(alice).nearMisses).toBe(1);

        // Still in the gap: the same pass
        place(alice, 60.1, 50, 0);
        game.update(16);
        expect(stats(alice).squeezes).toBe(1);
    });

    it('does not count a trail on one side only, nor a wide gap', () => {
        game.world.addBody(new AvatarBody(60.2, 51.4, bob));
        place(alice, 60, 50, 0);
        game.update(16);

        expect(stats(alice).squeezes).toBe(0);
        expect(stats(alice).nearMisses).toBe(1);

        place(alice, 80, 50, 0);
        game.world.addBody(new AvatarBody(80.2, 45, bob));
        game.world.addBody(new AvatarBody(80.2, 55, bob));
        game.update(16);

        expect(stats(alice).squeezes).toBe(0);
    });

    it('counts nothing while the avatar is invincible: it would be too easy', () => {
        corridor(1.4);
        game.world.addBody(new AvatarBody(50, 50, bob));
        alice.setInvincible(true);
        place(alice, 60, 50, 0);
        game.update(16);
        place(alice, 50, 50, 0);
        game.update(16);

        expect(alice.alive).toBe(true);
        expect(stats(alice).nearMisses).toBe(0);
        expect(stats(alice).squeezes).toBe(0);

        // The next approach after the end of the bonus counts again
        alice.setInvincible(false);
        place(alice, 60, 50, 0);
        game.update(16);

        expect(stats(alice).squeezes).toBe(1);
    });

    it('keeps the result of every round', () => {
        vi.setSystemTime(Date.now() + 2500);
        place(alice, 99.5, 50, 0);
        place(bob, 99.5, 20, 0);
        place(carl, 50, 50, 1);
        game.update(16);

        const { rounds } = game.stats.serialize();

        expect(rounds).toEqual([{ round: 1, winner: carl.id, duration: expect.any(Number), size: expect.any(Number) }]);
        expect(rounds[0].duration).toBeGreaterThanOrEqual(2500);
    });

    it('gives awards for them', () => {
        corridor(1.4);
        place(alice, 60, 50, 0);
        game.update(16);

        expect(game.stats.getAwards()).toContainEqual({ id: 'needle', player: alice.id, value: 1 });
    });
});

describe('gap runs', () => {
    beforeEach(() => {
        startRound();
        place(carl, 90, 90, 1);
        bob.setPrinting(false);
        // Bob leaves a gap along x, between 40 and 45
        for (let x = 40; x <= 45; x += 0.3) {
            place(bob, x, 20, 0);
        }
        place(bob, 10, 10, 1);
    });

    it('counts the pass through the gap of somebody else, once per gap', () => {
        place(alice, 42, 21, 0);
        game.update(16);

        expect(stats(alice).gapRuns).toBe(1);

        place(alice, 43, 20, 0);
        game.update(16);

        expect(stats(alice).gapRuns).toBe(1);
        expect(game.stats.getAwards()).toContainEqual({ id: 'gapRunner', player: alice.id, value: 1 });
    });

    it('does not count where there is no gap, nor the gap of the player itself', () => {
        place(alice, 70, 70, 0);
        game.update(16);

        expect(stats(alice).gapRuns).toBe(0);

        bob.setPrinting(false);
        place(bob, 42, 20, 0);
        game.update(16);

        expect(stats(bob).gapRuns).toBe(0);
    });

    it('counts the next gap of the same player again', () => {
        bob.setPrinting(true);
        place(bob, 60, 20, 0);
        bob.setPrinting(false);
        place(bob, 60, 30, 0);
        place(bob, 60, 31, 0);
        place(alice, 60, 30.5, 0);
        game.update(16);

        place(alice, 42, 20, 0);
        game.update(16);

        expect(stats(alice).gapRuns).toBe(2);
    });

    it('counts nothing while invincible, and a gap left while invincible does not exist', () => {
        alice.setInvincible(true);
        place(alice, 42, 20, 0);
        game.update(16);

        expect(stats(alice).gapRuns).toBe(0);

        bob.setInvincible(true);

        for (let x = 20; x <= 30; x += 0.3) {
            place(bob, x, 50, 0);
        }

        alice.setInvincible(false);
        place(alice, 25, 50, 0);
        game.update(16);

        expect(stats(alice).gapRuns).toBe(0);
    });

    it('forgets the gaps with the trails', () => {
        game.clearTrails();
        game.world.activate();
        place(alice, 42, 20, 0);
        game.update(16);

        expect(stats(alice).gapRuns).toBe(0);
    });
});

describe('win streaks', () => {
    beforeEach(() => {
        startRound();
    });

    const endRound = (winner) => game.emit('round:end', { winner });

    it('keeps the best number of rounds won in a row', () => {
        for (const winner of [alice, alice, alice, bob, alice, alice, null, alice]) {
            endRound(winner);
        }

        expect(stats(alice).longestStreak).toBe(3);
        expect(stats(alice).roundsWon).toBe(6);
        expect(stats(bob).longestStreak).toBe(1);
        expect(stats(carl).longestStreak).toBe(0);
    });

    it('gives the award for two rounds in a row, not for one', () => {
        endRound(alice);
        endRound(bob);

        expect(game.stats.getAwards().map(({ id }) => id)).not.toContain('streak');

        endRound(bob);

        expect(game.stats.getAwards()).toContainEqual({ id: 'streak', player: bob.id, value: 2 });
    });
});

describe('counters of the round', () => {
    const round = (avatar) => game.stats.round.get(avatar.id);

    it('start every round at zero, the totals keep growing', () => {
        startRound();
        game.bonusManager.add(new BonusSelfFast(50, 50));
        place(alice, 50, 50, 0);
        game.bonusManager.testCatch(alice);

        expect(round(alice).bonuses).toBe(1);

        startRound();

        expect(round(alice)).toEqual({
            nearMisses: 0,
            squeezes: 0,
            bonuses: 0,
            kills: 0,
            distance: 0,
            wallTime: 0,
            gapRuns: 0,
            boostTime: 0,
            sabotages: 0,
            place: null
        });
        expect(stats(alice).bonuses).toBe(1);
    });

    it('count the kills and the distance of the round', () => {
        startRound();
        alice.emit('die', { avatar: bob, killer: carl, old: false });
        place(alice, 50, 50, 0);
        alice.setPosition(50, 53);

        expect(round(carl).kills).toBe(1);
        expect(round(alice).distance).toBeCloseTo(3);
    });

    it('add up the time close to a border, but not while the borders are no danger', () => {
        startRound();
        place(alice, 2, 50, 0);
        alice.setPosition(2, 51);
        vi.setSystemTime(Date.now() + 1500);
        alice.setPosition(2, 52);

        expect(round(alice).wallTime).toBe(1500);

        // Away from the border: nothing is added, and it starts again at the next approach
        alice.setPosition(50, 50);
        vi.setSystemTime(Date.now() + 1000);
        alice.setPosition(50, 51);

        expect(round(alice).wallTime).toBe(1500);

        alice.setInvincible(true);
        place(alice, 2, 50, 0);
        alice.setPosition(2, 51);
        vi.setSystemTime(Date.now() + 1000);
        alice.setPosition(2, 52);

        expect(round(alice).wallTime).toBe(1500);
    });

    it('give the places in the opposite order of the deaths, the survivor is first', () => {
        startRound();
        place(alice, 99.5, 50, 0);
        place(bob, 99.5, 20, 0);
        place(carl, 50, 50, 1);
        game.update(16);

        expect(game.inRound).toBe(false);
        expect(round(carl).place).toBe(1);
        expect([round(alice).place, round(bob).place].toSorted()).toEqual([2, 3]);
        expect(game.stats.previousPlaces.get(carl.id)).toBe(1);
        expect(game.stats.deathOrder).toHaveLength(2);
    });

    it('keep the size of the map with the result of the round', () => {
        startRound();
        place(alice, 99.5, 50, 0);
        place(bob, 99.5, 20, 0);
        place(carl, 50, 50, 1);
        game.update(16);

        expect(game.stats.serialize().rounds[0].size).toBe(game.size);
        expect(game.size).toBeGreaterThan(0);
    });
});
