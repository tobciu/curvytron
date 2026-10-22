import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvatarBody } from '../../src/server/core/AvatarBody.ts';
import { BonusSelfFast } from '../../src/server/model/Bonus/BonusSelfFast.ts';
import { BonusSelfSmall } from '../../src/server/model/Bonus/BonusSelfSmall.ts';
import { BonusSelfSlow } from '../../src/server/model/Bonus/BonusSelfSlow.ts';
import { createGame } from '../helpers/game.js';

let game;
let alice;
let bob;
let carl;

function startRound() {
    game.newRound();
    game.started = true;
    game.world.activate();
    game.bonusManager.world.activate();
    // The game starts the round after a countdown: here the test does it
    vi.clearAllTimers();
    game.emit('game:start', { game });
}

const feats = (id) => game.stats.serialize().feats.filter((feat) => feat.id === id);
const ids = () => game.stats.serialize().feats.map(({ id }) => id);

/** The victim crashes on the trail of the killer, on a border (no killer) or on their own trail */
const crash = (victim, killer = null) => game.kill(victim, killer ? new AvatarBody(0, 0, killer) : null, 0);

const endRound = (winner) => game.emit('round:end', { winner });

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

describe('feats', () => {
    it('starts without any', () => {
        startRound();

        expect(game.stats.serialize().feats).toEqual([]);
    });

    it('gives a clean sweep to the player that got everybody else on their trail', () => {
        startRound();
        crash(bob, alice);
        vi.advanceTimersByTime(3000);
        crash(carl, alice);
        endRound(alice);

        expect(feats('cleanSweep')).toEqual([{ id: 'cleanSweep', player: alice.id, round: 1 }]);
        expect(ids()).not.toContain('pacifist');
    });

    it('does not give a clean sweep when somebody else crashed on a border', () => {
        startRound();
        crash(bob, alice);
        crash(carl);
        endRound(alice);

        expect(ids()).not.toContain('cleanSweep');
    });

    it('has no clean sweep, no pacifist, no early exit with two players only', () => {
        ({
            game,
            avatars: [alice, bob]
        } = createGame(['Alice', 'Bob']));
        game.avatars.items.forEach((avatar) => avatar.printManager.stop());
        startRound();
        crash(bob, alice);
        endRound(alice);

        expect(game.stats.serialize().feats).toEqual([]);
    });

    it('gives a double kill for two kills within a second, not for two kills further apart', () => {
        startRound();
        crash(bob, alice);
        vi.advanceTimersByTime(600);
        crash(carl, alice);

        expect(feats('doubleKill')).toEqual([{ id: 'doubleKill', player: alice.id, round: 1 }]);

        startRound();
        crash(bob, alice);
        vi.advanceTimersByTime(2000);
        crash(carl, alice);

        expect(feats('doubleKill')).toHaveLength(1);
    });

    it('gives a kill from beyond the grave, not for a crash in the same moment', () => {
        startRound();
        crash(alice);
        crash(bob, alice);

        expect(ids()).not.toContain('graveKill');

        vi.advanceTimersByTime(1000);
        crash(carl, alice);

        expect(feats('graveKill')).toEqual([{ id: 'graveKill', player: alice.id, round: 1 }]);
    });

    it('gives revenge for the one that killed you in the round before, and says who', () => {
        startRound();
        crash(alice, bob);
        endRound(bob);

        startRound();
        crash(carl, alice);

        expect(ids()).not.toContain('revenge');

        crash(bob, alice);

        expect(feats('revenge')).toEqual([{ id: 'revenge', player: alice.id, round: 2, other: bob.id }]);
    });

    it('does not remember the revenge for longer than one round', () => {
        startRound();
        crash(alice, bob);
        endRound(bob);
        startRound();
        endRound(null);
        startRound();
        crash(bob, alice);

        expect(ids()).not.toContain('revenge');
    });

    it('gives a photo finish to the last players that die at the same moment', () => {
        startRound();
        crash(alice);
        vi.advanceTimersByTime(2000);
        crash(bob);
        crash(carl);
        endRound(null);

        expect(feats('photoFinish').map(({ player }) => player)).toEqual([bob.id, carl.id]);
    });

    it('gives no photo finish when the last two died one after the other, or somebody won', () => {
        startRound();
        crash(alice);
        vi.advanceTimersByTime(500);
        crash(bob);
        vi.advanceTimersByTime(500);
        crash(carl);
        endRound(null);

        expect(ids()).not.toContain('photoFinish');
    });

    it('gives a pacifist the win without a kill', () => {
        startRound();
        crash(bob);
        crash(carl, carl);
        endRound(alice);

        expect(feats('pacifist')).toEqual([{ id: 'pacifist', player: alice.id, round: 1 }]);
    });

    it('gives bad karma for dying soon after a bonus that is bad for you', () => {
        startRound();
        game.bonusManager.add(new BonusSelfFast(50, 50));
        alice.setPosition(50, 50);
        game.bonusManager.testCatch(alice);
        vi.advanceTimersByTime(2000);
        crash(alice);

        expect(feats('badKarma')).toEqual([{ id: 'badKarma', player: alice.id, round: 1 }]);

        startRound();
        game.bonusManager.add(new BonusSelfFast(50, 50));
        bob.setPosition(50, 50);
        game.bonusManager.testCatch(bob);
        vi.advanceTimersByTime(4000);
        crash(bob);

        expect(feats('badKarma')).toHaveLength(1);
    });

    it('does not count a bonus that helps you, like slowing down', () => {
        startRound();
        game.bonusManager.add(new BonusSelfSlow(50, 50));
        alice.setPosition(50, 50);
        game.bonusManager.testCatch(alice);
        vi.advanceTimersByTime(1000);
        crash(alice);

        expect(feats('badKarma')).toEqual([]);
    });

    it('gives an early exit for the first death three rounds in a row', () => {
        for (let round = 1; round <= 3; round++) {
            startRound();
            crash(alice);
            vi.advanceTimersByTime(1000);
            crash(bob, carl);
            endRound(carl);

            expect(feats('earlyExit')).toHaveLength(round === 3 ? 1 : 0);
        }

        startRound();
        crash(bob);
        crash(alice);
        endRound(carl);

        expect(feats('earlyExit')).toHaveLength(1);
    });

    it("gives time's up for dying right after the invincibility ran out, not later", () => {
        startRound();
        alice.setInvincible(true);
        vi.advanceTimersByTime(1000);
        alice.setInvincible(false);
        vi.advanceTimersByTime(300);
        crash(alice);

        expect(feats('timesUp')).toEqual([{ id: 'timesUp', player: alice.id, round: 1 }]);

        startRound();
        bob.setInvincible(true);
        bob.setInvincible(false);
        vi.advanceTimersByTime(2000);
        crash(bob);

        expect(feats('timesUp')).toHaveLength(1);
    });

    it('gives a bonus rush for three bonuses within five seconds', () => {
        startRound();

        const catchBonus = () => {
            game.bonusManager.add(new BonusSelfSmall(50, 50));
            alice.setPosition(50, 50);
            game.bonusManager.testCatch(alice);
        };

        catchBonus();
        vi.advanceTimersByTime(2000);
        catchBonus();

        expect(ids()).not.toContain('bonusRush');

        vi.advanceTimersByTime(2000);
        catchBonus();

        expect(feats('bonusRush')).toEqual([{ id: 'bonusRush', player: alice.id, round: 1 }]);
    });

    it('gives a daredevil for three close calls within three seconds', () => {
        startRound();

        const closeCall = () => game.stats.startCount(new Set(), game.stats.players.get(alice.id), 'nearMisses');

        closeCall();
        vi.advanceTimersByTime(1000);
        closeCall();
        vi.advanceTimersByTime(2500);
        closeCall();

        expect(ids()).not.toContain('daredevil');

        vi.advanceTimersByTime(500);
        closeCall();

        expect(feats('daredevil')).toEqual([{ id: 'daredevil', player: alice.id, round: 1 }]);
    });

    it('gives a rookie mistake for crashing alone at the start, not later and not on a trail of somebody else', () => {
        startRound();
        crash(bob, alice);
        crash(carl);

        expect(feats('rookieMistake').map(({ player }) => player)).toEqual([carl.id]);

        startRound();
        vi.setSystemTime(Date.now() + 6000);
        crash(alice);

        expect(feats('rookieMistake')).toHaveLength(1);
    });

    it('gives a wall rider for three seconds close to a border, not when something interrupts it', () => {
        startRound();

        const ride = (x, seconds) => {
            for (let i = 0; i <= seconds; i++) {
                alice.setPosition(x, 20 + i);
                vi.setSystemTime(Date.now() + 1000);
            }
        };

        ride(1, 2);
        alice.setPosition(40, 40);
        vi.setSystemTime(Date.now() + 1000);
        ride(1, 2);

        expect(ids()).not.toContain('wallRider');

        ride(1, 4);

        expect(feats('wallRider')).toEqual([{ id: 'wallRider', player: alice.id, round: 1 }]);
    });

    it('gives no wall rider when the borders are no danger', () => {
        startRound();
        game.borderless = true;

        for (let i = 0; i <= 5; i++) {
            alice.setPosition(1, 20 + i);
            vi.setSystemTime(Date.now() + 1000);
        }

        expect(ids()).not.toContain('wallRider');
    });

    it('gives a whitewash for winning the game without losing a round', () => {
        game.maxScore = 10;

        for (const winner of [alice, alice, alice]) {
            startRound();

            if (winner === alice && game.stats.rounds.length === 2) {
                alice.setScore(10);
            }

            endRound(winner);
        }

        expect(feats('whitewash')).toEqual([{ id: 'whitewash', player: alice.id, round: 3 }]);
    });

    it('gives no whitewash after a lost round, or for a short game', () => {
        game.maxScore = 10;

        for (const winner of [alice, bob, alice, alice]) {
            startRound();

            if (game.stats.rounds.length === 3) {
                alice.setScore(10);
            }

            endRound(winner);
        }

        expect(ids()).not.toContain('whitewash');

        ({
            game,
            avatars: [alice, bob, carl]
        } = createGame());
        game.maxScore = 10;

        for (const winner of [alice, alice]) {
            startRound();

            if (game.stats.rounds.length === 1) {
                alice.setScore(10);
            }

            endRound(winner);
        }

        expect(ids()).not.toContain('whitewash');
    });
});
