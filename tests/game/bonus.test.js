import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomConfig } from '../../src/server/model/RoomConfig.ts';
import { BonusSelfFast } from '../../src/server/model/Bonus/BonusSelfFast.ts';
import { BonusSelfSlow } from '../../src/server/model/Bonus/BonusSelfSlow.ts';
import { BonusSelfSmall } from '../../src/server/model/Bonus/BonusSelfSmall.ts';
import { BonusSelfMaster } from '../../src/server/model/Bonus/BonusSelfMaster.ts';
import { BonusSelfBorderless } from '../../src/server/model/Bonus/BonusSelfBorderless.ts';
import { BonusEnemyBig } from '../../src/server/model/Bonus/BonusEnemyBig.ts';
import { BonusEnemyInverse } from '../../src/server/model/Bonus/BonusEnemyInverse.ts';
import { BonusEnemyStraightAngle } from '../../src/server/model/Bonus/BonusEnemyStraightAngle.ts';
import { BonusLeaderFast } from '../../src/server/model/Bonus/BonusLeaderFast.ts';
import { BonusAllColor } from '../../src/server/model/Bonus/BonusAllColor.ts';
import { BonusGameBorderless } from '../../src/server/model/Bonus/BonusGameBorderless.ts';
import { BonusGameClear } from '../../src/server/model/Bonus/BonusGameClear.ts';
import { createGame, snapshot } from '../helpers/game.js';

const bonusTypes = Object.entries(new RoomConfig({ players: { count: () => 0 } }).bonusTypes);

let game;
let nextId = 1;
let alice;
let bob;
let carl;

beforeEach(() => {
    vi.useFakeTimers();
    ({
        game,
        avatars: [alice, bob, carl]
    } = createGame());

    // Bob is the leader
    bob.setScore(5);
    carl.setScore(2);
});

afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
});

/** In the game bonuses get an id when they pop, the stacks need it to tell them apart */
function pop(Bonus) {
    const bonus = new Bonus(10, 10);

    bonus.id = nextId++;

    return bonus;
}

describe('bonus list', () => {
    it('knows all the bonuses of the game', () => {
        expect(bonusTypes).toHaveLength(19);
    });

    it.each(bonusTypes)('%s is a well formed bonus', (name, Bonus) => {
        const bonus = new Bonus(10, 20);

        expect(['self', 'enemy', 'all', 'game', 'leader']).toContain(bonus.affect === 'self' ? 'self' : bonus.affect);
        expect(bonus.x).toBe(10);
        expect(bonus.y).toBe(20);
        expect(bonus.body.radius).toBe(3);
        expect(bonus.duration).toBeGreaterThanOrEqual(0);
        expect(Bonus.getProbability(game)).toBeGreaterThanOrEqual(0);
        expect(Bonus.getProbability(game)).toBeLessThanOrEqual(1);
    });

    it('knows the name of every bonus on the client side too', async () => {
        const { RoomConfig: ClientRoomConfig } = await import('../../src/client/model/RoomConfig.ts');

        expect(Object.keys(new ClientRoomConfig({ players: { count: () => 0 } }).bonusClasses).sort()).toEqual(
            bonusTypes.map(([name]) => name).sort()
        );
    });
});

describe('every bonus', () => {
    it.each(bonusTypes.filter(([name]) => name !== 'BonusGameClear'))(
        '%s is completely reverted when it ends',
        (name, Bonus) => {
            const before = game.avatars.items.map(snapshot);
            const borderless = game.borderless;
            const bonus = pop(Bonus);

            bonus.applyTo(alice, game);
            vi.advanceTimersByTime(bonus.duration + 1);

            expect(game.avatars.items.map(snapshot)).toEqual(before);
            expect(game.borderless).toBe(borderless);
            game.avatars.items.forEach((avatar) => expect(avatar.bonusStack.bonuses.isEmpty()).toBe(true));
        }
    );
});

describe('bonus effects', () => {
    it('speeds up the avatar that takes it, for 4 seconds', () => {
        pop(BonusSelfFast).applyTo(alice, game);

        expect(alice.velocity).toBe(28);
        expect(bob.velocity).toBe(16);

        vi.advanceTimersByTime(3999);
        expect(alice.velocity).toBe(28);

        vi.advanceTimersByTime(1);
        expect(alice.velocity).toBe(16);
    });

    it('adds up when taken twice', () => {
        pop(BonusSelfFast).applyTo(alice, game);
        pop(BonusSelfFast).applyTo(alice, game);

        expect(alice.velocity).toBe(40);

        vi.advanceTimersByTime(4000);

        expect(alice.velocity).toBe(16);
    });

    it('does not slow down below half of the normal speed', () => {
        pop(BonusSelfSlow).applyTo(alice, game);
        pop(BonusSelfSlow).applyTo(alice, game);

        expect(alice.velocity).toBe(8);
    });

    it('shrinks the avatar and its collision body', () => {
        pop(BonusSelfSmall).applyTo(alice, game);

        expect(alice.radius).toBeCloseTo(0.3);
        expect(alice.body.radius).toBeCloseTo(0.3);
    });

    it('makes the enemies bigger, not the avatar that takes it', () => {
        pop(BonusEnemyBig).applyTo(alice, game);

        expect(alice.radius).toBe(0.6);
        expect(bob.radius).toBeCloseTo(1.2);
        expect(carl.radius).toBeCloseTo(1.2);
    });

    it('only affects the enemies that are alive', () => {
        carl.die();
        pop(BonusEnemyBig).applyTo(alice, game);

        expect(bob.radius).toBeCloseTo(1.2);
        expect(carl.radius).toBe(0.6);
    });

    it('does nothing to an avatar that is dead when it takes it', () => {
        alice.die();
        pop(BonusSelfFast).applyTo(alice, game);

        expect(alice.velocity).toBe(16);
    });

    it('inverts the controls of the enemies, two inversions cancel each other', () => {
        pop(BonusEnemyInverse).applyTo(alice, game);

        expect(bob.inverse).toBe(true);
        expect(alice.inverse).toBe(false);

        pop(BonusEnemyInverse).applyTo(carl, game);

        expect(bob.inverse).toBe(false);
        expect(alice.inverse).toBe(true);
    });

    it('speeds up only the leader (the best enemy)', () => {
        pop(BonusLeaderFast).applyTo(alice, game);

        expect(bob.velocity).toBe(28);
        expect(carl.velocity).toBe(16);
        expect(alice.velocity).toBe(16);
    });

    it('turns in straight angles', () => {
        pop(BonusEnemyStraightAngle).applyTo(alice, game);

        expect(bob.directionInLoop).toBe(false);
        expect(bob.angularVelocityBase).toBeCloseTo(Math.PI / 2);
        expect(alice.directionInLoop).toBe(true);

        vi.advanceTimersByTime(5000);

        expect(bob.directionInLoop).toBe(true);
        expect(bob.angularVelocityBase).toBeCloseTo(0.0028);
    });

    it('lets the avatar go through the walls', () => {
        pop(BonusSelfBorderless).applyTo(alice, game);

        expect(alice.ghost).toBe(true);
    });

    it('makes the master invincible and stops its trail', () => {
        pop(BonusSelfMaster).applyTo(alice, game);

        expect(alice.invincible).toBe(true);
    });

    it('stops the trail of the master, it starts again afterwards', () => {
        const stop = vi.spyOn(alice.printManager, 'stop');
        const start = vi.spyOn(alice.printManager, 'start');

        pop(BonusSelfMaster).applyTo(alice, game);

        expect(stop).toHaveBeenCalled();

        vi.advanceTimersByTime(7500);

        expect(start).toHaveBeenCalled();
    });

    it('rotates the colors of everybody', () => {
        alice.setColor('#111111');
        bob.setColor('#222222');
        carl.setColor('#333333');

        pop(BonusAllColor).applyTo(alice, game);

        expect([alice.color, bob.color, carl.color].sort()).toEqual(['#111111', '#222222', '#333333']);
        expect(alice.color).not.toBe('#111111');

        vi.advanceTimersByTime(7500);

        expect([alice.color, bob.color, carl.color]).toEqual(['#ff0000', '#ff0000', '#ff0000']);
    });

    it('removes the borders of the game for 10 seconds', () => {
        pop(BonusGameBorderless).applyTo(alice, game);

        expect(game.borderless).toBe(true);

        vi.advanceTimersByTime(10000);

        expect(game.borderless).toBe(false);
    });

    it('clears the trails of the game', () => {
        const cleared = vi.fn();

        game.on('clear', cleared);
        pop(BonusGameClear).applyTo(alice, game);

        expect(cleared).toHaveBeenCalledOnce();
    });

    it('is more likely to clear the trails when many avatars are dead', () => {
        expect(BonusGameClear.getProbability(game)).toBe(0);

        bob.die();
        carl.die();

        expect(BonusGameClear.getProbability(game)).toBeCloseTo(0.7);
    });
});
