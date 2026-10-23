import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGame, place } from '../helpers/game.js';

let game;
let alice;
let bob;
let carl;

function setup(configure) {
    ({
        game,
        avatars: [alice, bob, carl]
    } = createGame(['Alice', 'Bob', 'Carl'], configure));
    game.avatars.items.forEach((avatar) => avatar.printManager.stop());
}

/** Play a round in which carl survives, the others hit the border one after the other */
function playRound(winner = carl) {
    const [first, second] = game.avatars.items.filter((avatar) => avatar !== winner);

    game.newRound();
    game.started = true;
    game.world.activate();
    place(first, 99.5, 50, 0);
    place(second, 50, 50, 1);
    place(winner, 20, 20, 1);
    game.update(16);
    place(second, 99.5, 20, 0);
    game.update(16);
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    game.avatars?.items.forEach((avatar) => avatar.printManager.stop());
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe('the settings of a room', () => {
    it('start classic and with the score as the end of the game', () => {
        setup();

        expect(game.scoring.id).toBe('classic');
        expect(game.winCondition).toBe('points');
        expect(game.warmdownTime).toBe(5000);
    });

    it('keep the mode and the condition in the game, with the defaults of the values', () => {
        setup((config) => config.setWinCondition('rounds'));

        expect(game.winCondition).toBe('rounds');
        expect(game.rounds).toBe(8);
        expect(game.minutes).toBe(15);
    });
});

describe('the end of a game played for rounds', () => {
    beforeEach(() => setup((config) => config.setWinCondition('rounds', 3)));

    it('plans the finale for the last two rounds, the last one is told', () => {
        const plans = [];

        for (const played of [0, 1, 2]) {
            game.roundsPlayed = played;
            game.planRound();
            plans.push([game.round.round, game.round.last, game.round.finale, game.scoreFactor]);
        }

        expect(plans).toEqual([
            [1, false, false, 1],
            [2, false, true, 2],
            [3, true, true, 2]
        ]);
    });

    it('counts all the sources of points twice in the finale only', () => {
        playRound();

        expect(carl.score).toBe(2);

        game.roundsPlayed = 1;
        playRound();

        // 3 players: the survivor gets 2, twice in the finale
        expect(carl.score).toBe(2 + 4);
        expect(game.roundsPlayed).toBe(2);
    });

    it('is not over before the last round, then the best wins', () => {
        game.roundsPlayed = 1;
        alice.setScore(20);

        expect(game.isWon()).toBeNull();

        playRound(bob);

        expect(game.round.last).toBe(false);

        game.roundsPlayed = 2;
        game.planRound();
        playRound(bob);

        expect(game.round.last).toBe(true);
        expect(game.finalPlayed).toBe(true);
        expect(game.isWon()).toBe(alice);
    });

    it('plays a tie break among the tied avatars when the score is tied after the last round', () => {
        game.roundsPlayed = 2;
        game.planRound();
        alice.setScore(5);
        bob.setScore(5);
        carl.setScore(1);
        game.finalPlayed = true;

        expect(game.isWon()).toBeNull();

        const before = carl.score;

        playRound(carl);

        expect(game.round).toMatchObject({ tiebreak: true, last: true, finale: false });
        expect(game.scoreFactor).toBe(1);
        // Only the tied avatars score: carl survives and gets nothing
        expect(carl.score).toBe(before);
        expect(alice.score + bob.score).toBeGreaterThan(10);
    });
});

describe('the end of a game played for some time', () => {
    beforeEach(() => setup((config) => config.setWinCondition('time', 15)));

    it('does not plan the end at the start of a long game', () => {
        game.planRound();

        expect(game.round).toMatchObject({ round: 1, last: false, finale: false });
    });

    it('plans the finale, then the last round when less than a round of time is left', () => {
        game.planRound();
        vi.setSystemTime(Date.now() + 15 * 60000 - 2 * game.averageRoundTime() + 1000);
        game.planRound();

        expect(game.round).toMatchObject({ last: false, finale: true });

        vi.setSystemTime(Date.now() + game.averageRoundTime());
        game.planRound();

        expect(game.round).toMatchObject({ last: true, finale: true });
    });

    it('learns how long a round takes from the rounds so far', () => {
        const start = game.averageRoundTime();

        game.stats.rounds.push({ round: 1, winner: null, duration: 30000, size: 100 });

        expect(game.averageRoundTime()).toBe(30000 + game.warmupTime + game.warmdownTime);
        expect(start).toBe(60000 + game.warmupTime + game.warmdownTime);
    });

    it('is over after the last round, when somebody is ahead', () => {
        game.finalPlayed = true;
        bob.setScore(3);

        expect(game.isWon()).toBe(bob);
    });
});
