import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BonusEnemyBig } from '../../src/server/model/Bonus/BonusEnemyBig.ts';
import { BonusEnemySlow } from '../../src/server/model/Bonus/BonusEnemySlow.ts';
import { BonusSelfFast } from '../../src/server/model/Bonus/BonusSelfFast.ts';
import { drawMissions } from '../../src/server/scoring/Missions.ts';
import { missionCount, missionPoints, missions, starPoints } from '../../src/shared/missions.ts';
import { createGame, place } from '../helpers/game.js';

let game;
let alice;
let bob;
let carl;

function setup(names = ['Alice', 'Bob', 'Carl'], configure = () => {}) {
    ({
        game,
        avatars: [alice, bob, carl]
    } = createGame(names, (config) => {
        config.setMode('starchase');
        configure(config);
    }));
    game.avatars.items.forEach((avatar) => avatar.printManager.stop());
}

/** Prepare the round and start it, as the countdown does */
function startRound(ids) {
    // The loop does not run: the tests look at one moment at a time
    game.start = vi.fn();
    game.newRound();
    game.started = true;
    game.world.activate();
    game.bonusManager.world.activate();

    if (ids) {
        game.missions.ids = ids;
        game.missions.markSent(Date.now());
    }

    game.emit('game:start', { game });
}

/** Bring the round to its end: the given avatars hit the border one after the other */
function finishRound(dying) {
    for (const avatar of dying) {
        place(avatar, 99.5, 50, 0);
        game.update(16);
    }
}

beforeEach(() => {
    vi.useFakeTimers();
    setup();
});

afterEach(() => {
    game.avatars?.items.forEach((avatar) => avatar.printManager.stop());
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe('what the missions and the stars are worth', () => {
    it('grows with the number of players, and is at least 1', () => {
        const table = [2, 4, 6, 10, 20].map((n) => [n, missionPoints(n), starPoints(n)]);

        expect(table).toEqual([
            [2, 1, 1],
            [4, 2, 1],
            [6, 3, 2],
            [10, 5, 3],
            [20, 10, 7]
        ]);
    });

    it('has one mission for two players, three from ten', () => {
        expect([2, 3, 9, 10, 20].map(missionCount)).toEqual([1, 2, 2, 3, 3]);
    });
});

describe('drawing the missions', () => {
    it('draws different missions, none of the round before', () => {
        for (let i = 0; i < 50; i++) {
            const previous = drawMissions(4);
            const drawn = drawMissions(4, previous);

            expect(new Set(drawn).size).toBe(2);
            expect(drawn.some((id) => previous.includes(id))).toBe(false);
        }
    });

    it('leaves out what makes no sense with two players', () => {
        for (let i = 0; i < 50; i++) {
            const [id, ...rest] = drawMissions(2);

            expect(rest).toEqual([]);
            expect(missions[id].minPlayers).toBeLessThanOrEqual(2);
        }
    });

    it('leaves out what needs bonuses that the room does not have', () => {
        const drawn = (bonuses) =>
            new Set(Array.from({ length: 200 }, () => drawMissions(10, [], Math.random, bonuses)).flat());

        expect(drawn([])).not.toContain('collector');
        expect(drawn([])).not.toContain('saboteur');
        expect(drawn(['BonusSelfFast'])).toContain('collector');
        expect(drawn(['BonusSelfFast', 'BonusEnemyBig'])).not.toContain('saboteur');
        // The slow ones help whoever they hit
        expect(drawn(['BonusEnemySlow', 'BonusLeaderSlow', 'BonusEnemyBig'])).not.toContain('saboteur');
        // The leader bonuses hit only the one in front
        expect(drawn(['BonusEnemyBig', 'BonusLeaderFast', 'BonusLeaderInverse'])).not.toContain('saboteur');
        expect(drawn(['BonusEnemyFast', 'BonusEnemyBig'])).toContain('saboteur');
    });

    it('draws the comeback only when there was a round before', () => {
        const drawn = (before) =>
            new Set(Array.from({ length: 200 }, () => drawMissions(10, [], Math.random, undefined, before)).flat());

        expect(drawn(false)).not.toContain('comeback');
        expect(drawn(true)).toContain('comeback');
    });

    it('takes back missions of the round before when the pool is too small', () => {
        const all = drawMissions(2, ['closeCombat', 'collector', 'hunter', 'wallRunner', 'marathon']);

        expect(all).toHaveLength(1);
    });
});

describe('a round of Star Chase', () => {
    it('shows the missions before the round, waits 8 s after it and starts at zero', () => {
        const told = vi.fn();

        game.on('round:missions', told);
        startRound();

        expect(game.warmdownTime).toBe(8000);
        expect(game.missions.ids).toHaveLength(2);
        expect(told).toHaveBeenCalledOnce();

        for (const standing of told.mock.calls[0][0]) {
            expect(standing.leaders).toEqual([]);
        }
    });

    it('gives a mission to the best, to all of them when tied, and to nobody for 0', () => {
        startRound(['collector', 'hunter']);
        game.stats.round.get(alice.id).bonuses = 2;
        game.stats.round.get(bob.id).bonuses = 2;

        const results = game.missions.results(null);

        expect(results.find(({ id }) => id === 'collector').winners.toSorted()).toEqual([alice.id, bob.id].toSorted());
        expect(results.find(({ id }) => id === 'hunter').winners).toEqual([]);
    });

    it('adds the points of the missions to the places, with the points listed in the summary', () => {
        startRound(['marathon', 'hunter']);
        game.stats.round.get(carl.id).distance = 500;
        game.stats.round.get(alice.id).distance = 100;
        game.stats.round.get(carl.id).kills = 1;
        finishRound([alice, bob]);

        // 3 players: a mission is worth 1. Carl wins the round (2) and both missions (1 + 1)
        expect(game.inRound).toBe(false);
        expect(carl.score).toBe(2 + 1 + 1);
        expect(game.summary.players.find(({ id }) => id === carl.id)).toEqual({
            id: carl.id,
            placement: 2,
            missions: 2,
            stars: 0,
            total: 4
        });
        expect(game.summary.missions.map(({ id }) => id)).toEqual(['marathon', 'hunter']);
    });

    it('counts the missions twice in the finale', () => {
        setup(['Alice', 'Bob', 'Carl'], (config) => config.setWinCondition('rounds', 2));
        startRound(['marathon', 'hunter']);
        game.stats.round.get(carl.id).distance = 500;
        game.stats.round.get(carl.id).kills = 1;
        finishRound([alice, bob]);

        expect(game.scoreFactor).toBe(2);
        // The round (2) and both missions (1 + 1), twice
        expect(carl.score).toBe(8);
        expect(game.summary.players.find(({ id }) => id === carl.id)).toMatchObject({
            placement: 4,
            missions: 4,
            total: 8
        });
    });

    it('tells the standing of the missions when it changes, not every frame', () => {
        const progress = vi.fn();

        game.on('mission:progress', progress);
        startRound(['collector', 'hunter']);
        place(alice, 50, 50, 0);
        game.update(16);

        expect(progress).not.toHaveBeenCalled();

        game.bonusManager.add(new BonusSelfFast(50, 50));
        place(alice, 50, 50, 0);
        game.bonusManager.testCatch(alice);
        vi.setSystemTime(Date.now() + 300);
        game.update(16);

        expect(progress).toHaveBeenCalledOnce();
        expect(progress.mock.calls[0][0]).toMatchObject([{ id: 'collector', leaders: [alice.id] }]);

        vi.setSystemTime(Date.now() + 300);
        game.update(16);

        expect(progress).toHaveBeenCalledOnce();
    });

    it('agrees at the end with the standing during the round', () => {
        startRound(['collector', 'hunter']);
        game.stats.round.get(bob.id).bonuses = 3;

        const live = game.missions.standing('collector').leaders;

        finishRound([alice, carl]);

        expect(live).toEqual([bob.id]);
        expect(game.summary.missions.find(({ id }) => id === 'collector').winners).toEqual(live);
    });

    it('caps what can be driven up', () => {
        startRound(['collector', 'hunter']);
        game.stats.round.get(alice.id).bonuses = 500;

        const [, value] = game.missions.standing('collector').values.find(([id]) => id === alice.id);

        expect(value).toBe(missions.collector.cap);
    });
});

describe('the missions with a yes or no', () => {
    it('kamikaze: the first to die takes somebody with them', () => {
        startRound(['kamikaze', 'comeback']);
        alice.emit('die', { avatar: alice, killer: null, old: false });
        game.stats.deathOrder.push(alice.id);

        expect(game.missions.standing('kamikaze').states).toEqual([
            [alice.id, 'open'],
            [bob.id, 'missed'],
            [carl.id, 'missed']
        ]);

        game.stats.round.get(alice.id).kills = 1;

        expect(game.missions.standing('kamikaze').leaders).toEqual([alice.id]);
    });

    it('comeback: wins after being the last one in the round before', () => {
        game.stats.previousPlaces = new Map([
            [alice.id, 1],
            [bob.id, 2],
            [carl.id, 3]
        ]);
        startRound(['comeback', 'kamikaze']);

        expect(game.missions.standing('comeback').states.map(([, state]) => state)).toEqual([
            'missed',
            'missed',
            'open'
        ]);

        finishRound([alice, bob]);

        expect(game.summary.missions.find(({ id }) => id === 'comeback').winners).toEqual([carl.id]);
    });
});

describe('the saboteur', () => {
    const catchBonus = (Bonus, avatar) => {
        game.bonusManager.add(new Bonus(50, 50));
        place(avatar, 50, 50, 0);
        game.bonusManager.testCatch(avatar);
    };

    it('counts the bonuses that harm the others, and goes to whoever caught the most', () => {
        startRound(['saboteur', 'comeback']);
        catchBonus(BonusEnemyBig, carl);
        catchBonus(BonusEnemyBig, carl);
        catchBonus(BonusEnemyBig, alice);

        expect(game.stats.round.get(carl.id).sabotages).toBe(2);
        expect(game.missions.standing('saboteur').leaders).toEqual([carl.id]);
    });

    it('does not count what helps the others, or what is only for oneself', () => {
        startRound(['saboteur', 'comeback']);
        catchBonus(BonusEnemySlow, carl);
        catchBonus(BonusSelfFast, carl);

        expect(game.stats.round.get(carl.id).sabotages).toBe(0);
        expect(game.stats.round.get(carl.id).bonuses).toBe(2);
    });

    it('does not count while the avatar is invincible', () => {
        startRound(['saboteur', 'comeback']);
        carl.setInvincible(true);
        catchBonus(BonusEnemyBig, carl);

        expect(game.stats.round.get(carl.id).sabotages).toBe(0);
    });

    it('gives the mission to all of them when tied, to nobody for 0', () => {
        startRound(['saboteur', 'comeback']);

        expect(game.missions.results(null)[0].winners).toEqual([]);

        catchBonus(BonusEnemyBig, alice);
        catchBonus(BonusEnemyBig, bob);

        expect(game.missions.results(null)[0].winners.toSorted()).toEqual([alice.id, bob.id].toSorted());
    });
});

describe('the speed demon', () => {
    const catchFast = (avatar) => {
        game.bonusManager.add(new BonusSelfFast(50, 50));
        place(avatar, 50, 50, 0);
        game.bonusManager.testCatch(avatar);
    };

    /** The avatar drives for a while: a position every 100 ms */
    const drive = (avatar, ticks) => {
        for (let i = 0; i < ticks; i++) {
            vi.setSystemTime(Date.now() + 100);
            avatar.setPosition(avatar.x + 0.5, avatar.y);
        }
    };

    it('counts the time with a speed-up of its own, and nothing without one', () => {
        startRound(['speedDemon', 'comeback']);
        drive(bob, 10);

        expect(game.stats.round.get(bob.id).boostTime).toBe(0);

        catchFast(alice);
        drive(alice, 11);

        // The first position only starts the clock
        expect(game.stats.round.get(alice.id).boostTime).toBe(1000);
        expect(game.missions.standing('speedDemon').leaders).toEqual([alice.id]);
    });

    it('counts two speed-ups at once twice, and stops when they run out', () => {
        startRound(['speedDemon', 'comeback']);
        catchFast(alice);
        catchFast(alice);
        drive(alice, 10);

        // Ten intervals of 100 ms, two speed-ups: 2000
        expect(game.stats.round.get(alice.id).boostTime).toBe(2000);

        vi.setSystemTime(Date.now() + 5000);
        drive(alice, 5);

        expect(game.stats.round.get(alice.id).boostTime).toBe(2000);
    });

    it('does not count the speed-ups of the others, nor while invincible', () => {
        startRound(['speedDemon', 'comeback']);
        catchFast(alice);
        carl.setInvincible(true);
        catchFast(carl);
        drive(bob, 10);
        drive(carl, 10);

        expect(game.stats.round.get(bob.id).boostTime).toBe(0);
        expect(game.stats.round.get(carl.id).boostTime).toBe(0);
    });

    it('is only drawn when the room has the speed-up', () => {
        const drawn = (bonuses) =>
            new Set(Array.from({ length: 200 }, () => drawMissions(10, [], Math.random, bonuses)).flat());

        expect(drawn(['BonusEnemyFast', 'BonusSelfSlow'])).not.toContain('speedDemon');
        expect(drawn(['BonusSelfFast'])).toContain('speedDemon');
    });
});

describe('the gap runner', () => {
    beforeEach(() => {
        startRound(['gapRunner', 'comeback']);
        place(carl, 90, 90, 1);
        bob.setPrinting(false);

        // Bob leaves a gap along x, between 40 and 45
        for (let x = 40; x <= 45; x += 0.3) {
            place(bob, x, 20, 0);
        }

        place(bob, 10, 10, 1);
    });

    it('counts the gaps of the others that were driven through, once each', () => {
        place(alice, 42, 21, 0);
        game.update(16);
        place(alice, 43, 20, 0);
        game.update(16);

        expect(game.stats.round.get(alice.id).gapRuns).toBe(1);
        expect(game.missions.standing('gapRunner').leaders).toEqual([alice.id]);
        expect(game.stats.round.get(bob.id).gapRuns).toBe(0);
    });

    it('does not count while invincible, and starts at zero in every round', () => {
        alice.setInvincible(true);
        place(alice, 42, 20, 0);
        game.update(16);

        expect(game.stats.round.get(alice.id).gapRuns).toBe(0);
    });
});

describe('players that leave and come back', () => {
    it('do not take part in the missions once they left', () => {
        startRound(['collector', 'hunter']);
        game.stats.round.get(bob.id).bonuses = 5;
        bob.destroy();
        bob.present = false;

        expect(game.missions.standing('collector').values.map(([id]) => id)).toEqual([alice.id, carl.id]);
        expect(game.missions.results(null)[0].winners).toEqual([]);
    });

    it('see the missions with their standing when they come in the middle of a round', () => {
        startRound(['collector', 'hunter']);
        game.stats.round.get(alice.id).bonuses = 2;

        const addEvents = vi.fn();

        game.controller.attachSpectator({ addEvents });

        const events = addEvents.mock.calls[0][0];
        const missions = events.find(([name]) => name === 'round:missions')[1];

        expect(events.find(([name]) => name === 'round:info')).toBeDefined();
        expect(missions.find(({ id }) => id === 'collector')).toMatchObject({ leaders: [alice.id] });
    });

    it('get the summary of the round that just ended', () => {
        startRound(['collector', 'hunter']);
        finishRound([alice, bob]);

        const addEvents = vi.fn();

        game.controller.attachSpectator({ addEvents });

        const events = addEvents.mock.calls[0][0];

        expect(events.find(([name]) => name === 'round:summary')[1]).toEqual(game.summary);
    });
});

describe('the room settings of Star Chase', () => {
    it('end for rounds by default, with a lower victory score for points', () => {
        const { room } = createGame(['Alice', 'Bob', 'Carl']);

        room.config.setMode('starchase');

        expect(room.config.winCondition).toBe('rounds');
        expect(room.config.getDefaultMaxScore()).toBe(12);

        room.config.setMode('classic');

        expect(room.config.winCondition).toBe('points');
        expect(room.config.getDefaultMaxScore()).toBe(20);
    });
});
