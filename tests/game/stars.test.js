import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BonusStar } from '../../src/server/model/Bonus/BonusStar.ts';
import { AvatarBody } from '../../src/server/core/AvatarBody.ts';
import { Body } from '../../src/server/core/Body.ts';
import { starCount, starLifetime } from '../../src/server/scoring/Stars.ts';
import { starPoints } from '../../src/shared/missions.ts';
import { createGame, place } from '../helpers/game.js';

let game;
let alice;
let bob;

function setup(names = ['Alice', 'Bob', 'Carl'], configure = () => {}) {
    ({
        game,
        avatars: [alice, bob]
    } = createGame(names, (config) => {
        config.setMode('starchase');
        configure(config);
    }));
    game.avatars.items.forEach((avatar) => avatar.printManager.stop());
}

/** Start the round without its loop, as the tests look at one moment at a time */
function startRound() {
    game.start = vi.fn();
    game.newRound();
    game.started = true;
    game.world.activate();
    game.bonusManager.world.activate();
    game.emit('game:start', { game });
}

const starsOnMap = () => game.bonusManager.bonuses.items.filter((bonus) => bonus instanceof BonusStar);

beforeEach(() => {
    vi.useFakeTimers();
    setup();
});

afterEach(() => {
    game.avatars?.items.forEach((avatar) => avatar.printManager.stop());
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe('how many stars, and for how long', () => {
    it('is half the players rounded up, at most 3, and 5 from ten players on', () => {
        expect([2, 3, 4, 5, 6, 8, 9, 10, 20].map(starCount)).toEqual([1, 2, 2, 3, 3, 3, 3, 5, 5]);
    });

    it('lives 10 s on the map of two players, and longer on a larger one', () => {
        expect(starLifetime(88, 88)).toBe(10000);
        expect(starLifetime(101, 88)).toBe(11477);
        expect(starLifetime(140, 88)).toBe(15909);
        expect(starLifetime(60, 88)).toBe(10000);
    });
});

describe('the star on the map', () => {
    it('is small, has no effect and is no choice of the room', () => {
        const star = new BonusStar(10, 20);

        expect(star.body.radius).toBe(1.5);
        expect(star.radius).toBeLessThan(3);
        expect(game.room.config.bonuses).not.toHaveProperty('BonusStar');
        expect(game.bonusManager.bonusTypes.map((type) => type.name)).not.toContain('BonusStar');
    });

    it('gives the points of a star to whoever catches it, with the finale, and is no bonus of the statistics', () => {
        startRound();

        const star = new BonusStar(50, 50);

        game.bonusManager.add(star);
        place(alice, 50, 50, 0);
        game.bonusManager.testCatch(alice);

        // Three players: a star is worth 1
        expect(starPoints(3)).toBe(1);
        expect(game.breakdown.get(alice.id)).toMatchObject({ stars: 1 });
        expect(alice.roundScore).toBe(1);
        expect(game.stats.players.get(alice.id).bonuses).toBe(0);
        expect(game.stats.round.get(alice.id).bonuses).toBe(0);
        expect(game.bonusManager.bonuses.exists(star)).toBe(false);
    });

    it('counts twice in the finale', () => {
        setup(['Alice', 'Bob', 'Carl'], (config) => config.setWinCondition('rounds', 2));
        startRound();
        game.bonusManager.add(new BonusStar(50, 50));
        place(alice, 50, 50, 0);
        game.bonusManager.testCatch(alice);

        expect(alice.roundScore).toBe(2);
    });
});

describe('when the stars come', () => {
    it('are planned once the round runs, none at the start', () => {
        startRound();

        expect(game.stars.started).toBe(false);

        game.update(16);
        game.update(16);

        expect(game.stars.started).toBe(true);
        expect(game.stars.timers.size).toBe(starCount(3));
        expect(starsOnMap()).toHaveLength(0);
    });

    it('come one by one, as many as the count of the round', () => {
        startRound();
        game.update(16);

        const spawned = [];

        game.bonusManager.on('bonus:pop', (bonus) => {
            if (bonus instanceof BonusStar) {
                spawned.push(Date.now());
            }
        });

        vi.advanceTimersByTime(40000);

        expect(spawned).toHaveLength(starCount(3));
        expect(new Set(spawned).size).toBe(spawned.length);
    });

    it('go away after their lifetime, and are told to the clients with it', () => {
        startRound();
        game.update(16);

        game.stars.spawn();

        const [star] = starsOnMap();
        const description = game.controller.describeBonus(star);

        expect(star.lifetime).toBe(starLifetime(game.size, game.getSize(2)));
        expect(description.slice(4)).toEqual([star.lifetime, star.lifetime]);

        vi.advanceTimersByTime(star.lifetime - 1);
        expect(game.bonusManager.bonuses.exists(star)).toBe(true);
        expect(game.controller.describeBonus(star)[5]).toBe(1);

        vi.advanceTimersByTime(1);
        expect(game.bonusManager.bonuses.exists(star)).toBe(false);
    });

    it('are taken off the map when the round ends, and nothing comes after that', () => {
        startRound();
        game.update(16);
        game.stars.spawn();

        expect(starsOnMap()).toHaveLength(1);

        place(alice, 99.5, 50, 0);
        place(bob, 99.5, 20, 0);
        game.update(16);

        expect(game.inRound).toBe(false);
        expect(starsOnMap()).toHaveLength(0);

        vi.advanceTimersByTime(60000);
        expect(starsOnMap()).toHaveLength(0);
    });
});

describe('where the stars come', () => {
    it('close to a border or to a trail, not in the open', () => {
        startRound();

        // A trail in the middle: the stars come next to it, or at a border
        for (let x = 20; x <= 70; x += 2) {
            game.world.addBody(new AvatarBody(x, 50, alice));
        }

        const wall = game.size;
        const spawner = game.stars;

        for (let i = 0; i < 40; i++) {
            const [x, y] = spawner.pickPosition();
            const border = Math.min(x, y, wall - x, wall - y);
            const trail = Math.abs(y - 50) < 12 && x > 10 && x < 80;

            expect(border <= 8 || trail, `${x},${y}`).toBe(true);
        }
    });

    it('not on a trail or on a bonus', () => {
        startRound();

        for (let x = 20; x <= 70; x += 2) {
            game.world.addBody(new AvatarBody(x, 50, alice));
        }

        for (let i = 0; i < 40; i++) {
            const [x, y] = game.stars.pickPosition();

            expect(game.world.getBody(new Body(x, y, 1.5))).toBeFalsy();
        }
    });
});

describe('players that come back', () => {
    it('see the stars with the time they have left', () => {
        startRound();
        game.update(16);
        game.stars.spawn();

        // A star of the plan may come in these seconds too: look at the one that was put there
        const [star] = starsOnMap();

        vi.advanceTimersByTime(4000);

        const addEvents = vi.fn();

        game.controller.attachSpectator({ addEvents });

        const pop = addEvents.mock.calls[0][0].find(([name, data]) => name === 'bonus:pop' && data[0] === star.id)[1];

        expect(pop[3]).toBe('BonusStar');
        expect(pop[4]).toBe(starLifetime(game.size, game.getSize(2)));
        expect(pop[5]).toBe(pop[4] - 4000);
    });
});
