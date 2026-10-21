import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvatarBody } from '../../src/server/core/AvatarBody.ts';
import { createGame, place } from '../helpers/game.js';

let game;
let alice;
let bob;
let carl;

/** Start the round, without waiting for the countdown nor for the game loop */
function startRound() {
    game.newRound();
    game.started = true;
    game.world.activate();
}

/** A frame of 16 ms */
const frame = (step = 16) => game.update(step);

beforeEach(() => {
    vi.useFakeTimers();
    ({
        game,
        avatars: [alice, bob, carl]
    } = createGame());
    // Nobody leaves a trail unless a test asks for it
    game.avatars.items.forEach((avatar) => avatar.printManager.stop());
});

afterEach(() => {
    game.avatars?.items.forEach((avatar) => avatar.printManager.stop());
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe('a new round', () => {
    it('puts every avatar in the game area, alive, with a clean state', () => {
        const rounds = vi.fn();

        game.on('round:new', rounds);
        alice.setVelocity(40);
        alice.die();
        startRound();

        expect(rounds).toHaveBeenCalledOnce();
        expect(game.inRound).toBe(true);

        for (const avatar of game.avatars.items) {
            expect(avatar.alive).toBe(true);
            expect(avatar.velocity).toBe(16);
            expect(game.world.getBoundIntersect(avatar.body, avatar.radius)).toBeNull();
        }
    });

    it('does not start twice', () => {
        const rounds = vi.fn();

        game.on('round:new', rounds);
        game.newRound();
        game.newRound();

        expect(rounds).toHaveBeenCalledOnce();
    });

    it('starts to play after the countdown', () => {
        const started = vi.fn();

        game.on('game:start', started);
        game.newRound();

        vi.advanceTimersByTime(2999);
        expect(started).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(started).toHaveBeenCalledOnce();

        game.stop();
    });

    it('marks the leader with a golden border', () => {
        bob.setScore(4);
        startRound();

        expect(bob.borderColor).toBe('#FFD700');
        expect(alice.borderColor).not.toBe('#FFD700');
    });
});

describe('deaths', () => {
    beforeEach(startRound);

    it('kills an avatar that hits a border', () => {
        const deaths = [];

        game.on('player:leave', () => {});
        alice.on('die', (data) => deaths.push(data));
        place(alice, 99.5, 50, 0);
        frame();

        expect(alice.alive).toBe(false);
        expect(deaths).toEqual([{ avatar: alice, killer: null, old: null }]);
        expect(game.deaths.exists(alice)).toBe(true);
    });

    it('does not kill an avatar that stays inside', () => {
        place(alice, 50, 50, 1);
        frame();

        expect(alice.alive).toBe(true);
    });

    it('gives the same score to the avatars that die in the same frame', () => {
        place(alice, 99.5, 50, 0);
        place(bob, 99.5, 20, 0);
        place(carl, 50, 50, 1);
        frame();

        expect(game.inRound).toBe(false);
        expect([alice.score, bob.score, carl.score]).toEqual([0, 0, 2]);
    });

    it('ends the round when only one avatar is left, and rewards it', () => {
        const ended = vi.fn();

        game.on('round:end', ended);
        place(alice, 99.5, 50, 0);
        place(bob, 50, 50, 1);
        place(carl, 60, 60, 1);
        frame();

        expect(game.inRound).toBe(true);

        place(bob, 99.5, 20, 0);
        frame();

        expect(game.inRound).toBe(false);
        expect(ended).toHaveBeenCalledOnce();
        expect(game.roundWinner).toBe(carl);
        expect([alice.score, bob.score, carl.score]).toEqual([0, 1, 2 + 0]);
    });

    it('ends the round when everybody dies in the same frame, without winner', () => {
        for (const avatar of game.avatars.items) {
            place(avatar, 99.5, 50, 0);
        }

        frame();

        expect(game.inRound).toBe(false);
        expect(game.roundWinner).toBeNull();
        expect(game.avatars.items.map((avatar) => avatar.score)).toEqual([0, 0, 0]);
    });

    it('does not kill an avatar that goes through the borders when they are removed', () => {
        game.setBorderless(true);
        place(alice, 99.9, 50, 0);
        frame();

        expect(alice.alive).toBe(true);
        expect(alice.x).toBeLessThan(5);
    });

    it('does not kill a ghost at the border either, it comes out on the other side', () => {
        alice.setGhost(true);
        place(alice, 0.2, 50, Math.PI);
        frame();

        expect(alice.alive).toBe(true);
        expect(alice.x).toBeGreaterThan(90);
    });

    it('is invincible against trails, but not against the borders', () => {
        place(bob, 50, 50, 1);
        bob.addPoint(30, 30);
        place(alice, 30, 30, 1);
        alice.setInvincible(true);
        frame();

        expect(alice.alive).toBe(true);

        place(alice, 99.5, 50, 0);
        frame();

        expect(alice.alive).toBe(false);
    });
});

describe('trails', () => {
    beforeEach(startRound);

    it('kills an avatar that touches the trail of another one, and tells who killed it', () => {
        const deaths = [];

        alice.on('die', (data) => deaths.push(data));
        bob.addPoint(30, 30);
        place(alice, 30.2, 30.2, 1);
        frame();

        expect(alice.alive).toBe(false);
        expect(deaths[0].killer).toBe(bob);
        expect(deaths[0].old).toBe(false);
    });

    it('considers a trail as old after two seconds', () => {
        const deaths = [];

        alice.on('die', (data) => deaths.push(data));
        bob.addPoint(30, 30);
        vi.advanceTimersByTime(2000);
        place(alice, 30.2, 30.2, 1);
        frame();

        expect(deaths[0].old).toBe(true);
    });

    it('does not kill an avatar that touches its own latest points', () => {
        place(alice, 30, 30, 1);

        for (let i = 0; i < 3; i++) {
            alice.addPoint(30, 30);
        }

        frame();

        expect(alice.alive).toBe(true);
    });

    it('kills an avatar that touches its own older trail', () => {
        place(alice, 30, 30, 1);

        for (let i = 0; i < 10; i++) {
            alice.addPoint(30, 30);
        }

        alice.bodyCount = 10;
        place(alice, 30, 30, 1);
        frame();

        expect(alice.alive).toBe(false);
    });

    it('does not draw the trail before the game is running', () => {
        game.started = false;
        bob.addPoint(30, 30);

        expect(game.world.getBody(new AvatarBody(30, 30, alice))).toBeNull();
    });

    it('clears the trails of the world at the start of the next round', () => {
        bob.addPoint(30, 30);
        game.endRound();
        game.stop?.();
        game.newRound();

        expect(game.world.getBody(new AvatarBody(30, 30, alice))).toBeNull();
    });
});

describe('scores', () => {
    beforeEach(startRound);

    it('adds the round scores to the scores when the round ends', () => {
        place(alice, 99.5, 50, 0);
        place(bob, 99.5, 20, 0);
        frame();
        // Carl is the only one left, he gets one point per avatar that died
        expect(carl.score).toBe(2);
        expect(alice.score).toBe(0);
    });

    it('gives a single player one point for the round', () => {
        const solo = createGame(['Solo']);

        solo.game.newRound();
        solo.game.started = true;
        solo.game.world.activate();
        place(solo.avatars[0], 99.5, 50, 0);
        solo.game.update(16);

        expect(solo.avatars[0].score).toBe(1);

        solo.avatars[0].printManager.stop();
    });
});

describe('end of the game', () => {
    it('is won by the avatar that reached the maximum score alone', () => {
        game.maxScore = 10;
        bob.setScore(10);
        carl.setScore(4);

        expect(game.isWon()).toBe(bob);
    });

    it('goes on in a tie break when the best are tied', () => {
        game.maxScore = 10;
        alice.setScore(10);
        bob.setScore(10);

        expect(game.isWon()).toBeNull();
    });

    it('goes on while nobody reached the maximum score', () => {
        game.maxScore = 10;
        bob.setScore(9);

        expect(game.isWon()).toBeNull();
    });

    it('is over when nobody is left, or when a single avatar is left of several', () => {
        alice.destroy();
        bob.destroy();

        expect(game.isWon()).toBe(true);

        carl.destroy();

        expect(game.isWon()).toBe(true);
    });

    it('ends and tells it once an avatar won', () => {
        const ended = vi.fn();

        game.maxScore = 3;
        game.on('end', ended);
        startRound();
        bob.setScore(3);
        place(alice, 99.5, 50, 0);
        place(carl, 99.5, 20, 0);
        frame();
        vi.advanceTimersByTime(3000 + 5000);

        expect(game.gameWinner).toBe(bob);
        expect(ended).toHaveBeenCalledOnce();
    });

    it('goes to the next round when nobody won', () => {
        const rounds = vi.fn();

        startRound();
        game.on('round:new', rounds);
        place(alice, 99.5, 50, 0);
        place(carl, 99.5, 20, 0);
        frame();
        vi.advanceTimersByTime(5000);

        expect(rounds).toHaveBeenCalledOnce();
        expect(game.inRound).toBe(true);
    });
});

describe('a player that leaves', () => {
    it('ends the round when the last other one is gone', () => {
        startRound();
        game.removeAvatar(alice);
        expect(game.inRound).toBe(true);

        game.removeAvatar(bob);

        expect(game.inRound).toBe(false);
        expect(carl.alive).toBe(true);
    });

    it('is not placed in the next rounds, and counts as dead', () => {
        alice.destroy();
        game.newRound();

        expect(alice.alive).toBe(false);
        expect(game.deaths.exists(alice)).toBe(true);
        expect(game.getPresentAvatars().count()).toBe(2);
    });
});

describe('a bug in a game', () => {
    it('ends this game only, and the pending timers do not bring the server down', () => {
        const ended = vi.fn();
        const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

        game.on('end', ended);
        game.newRound();
        game.update = () => {
            throw new Error('bug');
        };

        game.onFrame(16);

        expect(ended).toHaveBeenCalledOnce();
        expect(game.avatars).toBeUndefined();
        expect(errors).toHaveBeenCalled();

        // The countdown of the round that was starting, and the end of a round: nothing happens
        expect(() => vi.advanceTimersByTime(10000)).not.toThrow();
        errors.mockRestore();
    });
});
