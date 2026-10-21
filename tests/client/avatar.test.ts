import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Player } from '../../src/client/model/Player.ts';
import { Avatar } from '../../src/client/model/Avatar.ts';
import { Trail } from '../../src/client/model/Trail.ts';
import { BonusStack } from '../../src/client/model/BonusStack.ts';
import { StackedBonus } from '../../src/client/model/bonus/StackedBonus.ts';
import { MapBonus } from '../../src/client/model/bonus/MapBonus.ts';
import { BonusManager } from '../../src/client/manager/BonusManager.ts';
import { Collection } from '../../src/shared/Collection.ts';

let avatars: any[] = [];

/**
 * Minimal player the client Avatar reads: id, name, color, local flag, and the
 * control binding for local players.
 */
function createPlayer(id = 1, local = false) {
    const client: any = { id: 1, players: new Collection() };
    const player = new Player(id, client, `Player ${id}`, '#ff0000', true);

    if (local) {
        player.setLocal(true);
    }

    return player;
}

function createAvatar(local = false) {
    const avatar = new Avatar(createPlayer(1, local));

    avatars.push(avatar);

    return avatar;
}

beforeEach(() => {
    vi.useFakeTimers();
    // jsdom has no Touch class, and PlayerInput references it to type its bindings
    vi.stubGlobal('Touch', class Touch {});
});

afterEach(() => {
    avatars.forEach((avatar) => avatar.destroy());
    avatars = [];
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('Client Avatar', () => {
    it('starts with two canvases and the properties of its player', () => {
        const avatar = createAvatar();

        expect(avatar.local).toBe(false);
        expect(avatar.input).toBeUndefined();
        expect(avatar.name).toBe('Player 1');
        expect(avatar.color).toBe('#ff0000');
        expect(avatar.canvas.element.width).toBe(100);
        expect(avatar.arrow.element.width).toBe(200);
        expect(avatar.width).toBeCloseTo(1.2);
        expect(avatar.canvasWidth).toBe(100);
        expect(avatar.canvasRadius).toBe(50);
        expect(avatar.changed).toBe(false);
    });

    it('creates an input for the local player, from its control binding', () => {
        const avatar = createAvatar(true);

        expect(avatar.local).toBe(true);
        expect(avatar.input).toBeDefined();
        expect(avatar.input.binding).toEqual([37, 39]);
    });

    it('draws its own trail and bonus stack classes', () => {
        const avatar = createAvatar();

        expect(avatar.trail).toBeInstanceOf(Trail);
        expect(avatar.bonusStack).toBeInstanceOf(BonusStack);
        expect(avatar.createTrail()).toBeInstanceOf(Trail);
        expect(avatar.createBonusStack()).toBeInstanceOf(BonusStack);
    });

    it('follows the server position instead of moving that step', () => {
        const avatar = createAvatar();

        avatar.setAngle(1);
        avatar.setAngle(0);
        avatar.setPositionFromServer(10, 20);

        expect(avatar.changed).toBe(true);

        avatar.update(1000);

        expect(avatar.x).toBe(10);
        expect(avatar.y).toBe(20);
        expect(avatar.changed).toBe(false);
    });

    it('computes the drawing origin of its canvas', () => {
        const avatar = createAvatar();

        avatar.setPositionFromServer(10, 20);
        avatar.update(0);

        expect(avatar.startX).toBe(avatar.canvas.round(10 - 50));
        expect(avatar.startY).toBe(avatar.canvas.round(20 - 50));
    });

    it('moves along its heading between server updates', () => {
        const avatar = createAvatar();

        avatar.setAngle(1);
        avatar.setAngle(0);
        avatar.update(1000);

        expect(avatar.x).toBeCloseTo(16);
        expect(avatar.y).toBeCloseTo(0);
    });

    it('turns while an angular velocity is set', () => {
        const avatar = createAvatar();

        avatar.updateAngularVelocity(1);
        avatar.update(100);

        expect(avatar.angle).toBeCloseTo(0.28);
    });

    it('does not move once dead', () => {
        const avatar = createAvatar();

        avatar.setAngle(1);
        avatar.setAngle(0);
        avatar.die();
        avatar.update(1000);

        expect(avatar.x).toBe(0);
        expect(avatar.startX).toBe(avatar.canvas.round(-50));
    });

    it('queues the points of the server while printing', () => {
        const avatar = createAvatar();

        avatar.setPrinting(true);
        avatar.setPositionFromServer(5, 6);

        // The trail defers the clear of a too-far point until its segment is read
        expect(avatar.trail.points).toEqual([[0, 0]]);
        expect(avatar.trail.clearAsked).toBe(true);
        expect(avatar.trail.queueX).toBe(5);

        expect(avatar.trail.getLastSegment()).toEqual([[0, 0]]);
        expect(avatar.trail.points).toEqual([[5, 6]]);
    });

    it('resizes its canvas with the scale of the game', () => {
        const avatar = createAvatar();

        avatar.setScale(2);

        expect(avatar.canvas.element.width).toBe(3);
        expect(avatar.canvasWidth).toBe(3);
        expect(avatar.canvasRadius).toBe(1.5);
        expect(avatar.changed).toBe(true);
    });

    it('grows its canvas with its radius', () => {
        const avatar = createAvatar();

        avatar.setRadius(2);

        expect(avatar.radius).toBe(2);
        expect(avatar.width).toBe(4);
        expect(avatar.canvas.element.width).toBe(4);
    });

    it('redraws its head when its colors change', () => {
        const avatar = createAvatar();
        const drawHead = vi.spyOn(avatar, 'drawHead');

        avatar.setColor('#00ff00');
        avatar.setBorderColor('#111111');

        expect(drawHead).toHaveBeenCalledTimes(2);
        expect(avatar.color).toBe('#00ff00');
        expect(avatar.borderColor).toBe('#111111');
    });

    it('keeps the difference of the score as the round score', () => {
        const avatar = createAvatar();

        avatar.setScore(5);

        expect(avatar.score).toBe(5);
        expect(avatar.roundScore).toBe(5);

        avatar.setScore(7);

        expect(avatar.score).toBe(7);
        expect(avatar.roundScore).toBe(2);
    });

    it('announces its death, with itself as the detail', () => {
        const avatar = createAvatar();
        const deaths: any[] = [];

        avatar.bonusStack.add(new StackedBonus(1, 'BonusSelfFast', 5000));
        avatar.on('die', (event) => deaths.push(event));
        avatar.die();

        expect(avatar.alive).toBe(false);
        expect(deaths).toHaveLength(1);
        expect(deaths[0].type).toBe('die');
        expect(deaths[0].detail).toBe(avatar);
        expect(avatar.bonusStack.bonuses.isEmpty()).toBe(true);
    });

    it('draws its head and its arrow on the stubbed contexts', () => {
        const avatar = createAvatar();

        avatar.setColor('#00ff00');
        avatar.setBorderColor('#111111');

        expect(() => {
            avatar.drawHead();
            avatar.drawArrow();
        }).not.toThrow();
    });

    it('detaches the input and empties everything when destroyed', () => {
        const avatar = createAvatar(true);

        avatar.trail.addPoint(1, 1);

        const detach = vi.spyOn(avatar.input, 'detachEvents');

        avatar.destroy();

        expect(detach).toHaveBeenCalled();
        expect(avatar.input).toBeNull();
        expect(avatar.present).toBe(false);
        expect(avatar.alive).toBe(false);
        // The client trail only defers its clear
        expect(avatar.trail.clearAsked).toBe(true);
    });

    it('goes back to the defaults on a new round', () => {
        const avatar = createAvatar();

        avatar.setRadius(3);
        avatar.die();
        avatar.clear();

        expect(avatar.alive).toBe(true);
        expect(avatar.radius).toBeCloseTo(0.6);
        expect(avatar.width).toBeCloseTo(1.2);
        expect(avatar.canvas.element.width).toBe(2);
    });

    it('dispatches properties to their setter, and refuses unknown ones', () => {
        const avatar = createAvatar();

        avatar.set('radius', 2);

        expect(avatar.radius).toBe(2);
        expect(() => avatar.set('nope', 1)).toThrow('Unknown setter setNope');
    });

    it('knows when it carries bonuses', () => {
        const avatar = createAvatar();

        expect(avatar.hasBonus()).toBe(false);

        avatar.bonusStack.add(new StackedBonus(1, 'BonusSelfFast', 5000));

        expect(avatar.hasBonus()).toBe(true);
    });
});

describe('Client Trail', () => {
    function createTrail() {
        return new Trail({ color: '#ff0000', radius: 10 } as any);
    }

    it('starts empty, and has no last segment', () => {
        const trail = createTrail();

        expect(trail.clearAsked).toBe(false);
        expect(trail.queueX).toBeNull();
        expect(trail.queueY).toBeNull();
        expect(trail.getLastSegment()).toBeNull();
    });

    it('adds points closer than the tolerance right away', () => {
        const trail = createTrail();

        trail.addPoint(1, 1);
        trail.addPoint(1.5, 1.9);

        expect(trail.points).toEqual([
            [1, 1],
            [1.5, 1.9]
        ]);
        expect(trail.clearAsked).toBe(false);
    });

    it('defers a clear when a point jumps further than the tolerance', () => {
        const trail = createTrail();

        trail.addPoint(1, 1);
        trail.addPoint(50, 1);

        expect(trail.clearAsked).toBe(true);
        expect(trail.queueX).toBe(50);
        expect(trail.queueY).toBe(1);
        expect(trail.points).toEqual([[1, 1]]);
    });

    it('applies the deferred clear when reading the last segment', () => {
        const trail = createTrail();

        trail.addPoint(1, 1);
        trail.addPoint(50, 1);

        expect(trail.getLastSegment()).toEqual([[1, 1]]);
        expect(trail.points).toEqual([[50, 1]]);
        expect(trail.clearAsked).toBe(false);
        expect(trail.queueX).toBeNull();
    });

    it('keeps only the last point of a read segment', () => {
        const trail = createTrail();

        trail.addPoint(1, 1);
        trail.addPoint(2, 2);
        trail.addPoint(3, 3);

        expect(trail.getLastSegment()).toEqual([
            [1, 1],
            [2, 2],
            [3, 3]
        ]);
        expect(trail.points).toEqual([[3, 3]]);

        expect(trail.getLastSegment()).toEqual([[3, 3]]);
        expect(trail.points).toEqual([[3, 3]]);
    });
});

describe('Client Bonus Stack', () => {
    let stack: any;

    beforeEach(() => {
        BonusManager.assets.BonusSelfFast = { name: 'fast-asset' };
        stack = new BonusStack({} as any);
    });

    afterEach(() => {
        stack.clear();
        delete BonusManager.assets.BonusSelfFast;
    });

    it('grows its canvas with every bonus added', () => {
        // A fresh canvas keeps the browser default width until the first update
        expect(stack.canvas.element.width).toBe(300);

        stack.add(new StackedBonus(1, 'BonusSelfFast', 5000));

        expect(stack.bonuses.count()).toBe(1);
        expect(stack.canvas.element.width).toBe(20);
        expect(stack.changed).toBe(false);

        stack.add(new StackedBonus(2, 'BonusSelfFast', 5000));

        expect(stack.canvas.element.width).toBe(40);
    });

    it('schedules the warning of every bonus', () => {
        const bonus = new StackedBonus(1, 'BonusSelfFast', 5000);

        stack.add(bonus);

        expect(bonus.timeout).toBeTruthy();
    });

    it('shrinks and detaches when a bonus is removed', () => {
        const bonus = new StackedBonus(1, 'BonusSelfFast', 5000);

        stack.add(bonus);

        const clear = vi.spyOn(bonus, 'clear');

        stack.remove(bonus);

        expect(clear).toHaveBeenCalled();
        expect(stack.bonuses.isEmpty()).toBe(true);
        expect(stack.canvas.element.width).toBe(0);

        // The change listener is gone
        expect(bonus._events.change).toBeUndefined();
    });

    it('clears every bonus', () => {
        const first = new StackedBonus(1, 'BonusSelfFast', 5000);
        const second = new StackedBonus(2, 'BonusSelfFast', 5000);

        stack.add(first);
        stack.add(second);

        const firstClear = vi.spyOn(first, 'clear');
        const secondClear = vi.spyOn(second, 'clear');

        stack.clear();

        expect(firstClear).toHaveBeenCalled();
        expect(secondClear).toHaveBeenCalled();
        expect(stack.bonuses.isEmpty()).toBe(true);
    });

    it('redraws only the bonuses that changed', () => {
        const bonus = new StackedBonus(1, 'BonusSelfFast', 5000);

        stack.add(bonus);

        expect(bonus.changed).toBe(false);
        expect(stack.changed).toBe(false);

        bonus.changed = true;
        stack.draw();

        expect(bonus.changed).toBe(false);
        expect(stack.changed).toBe(false);
    });

    it('redraws when a bonus announces a change', () => {
        const bonus = new StackedBonus(1, 'BonusSelfFast', 3000);

        stack.add(bonus);

        stack.changed = false;
        bonus.toggleOpacity();

        // The stack listened to the change and drew itself again
        expect(stack.changed).toBe(false);
        expect(bonus.changed).toBe(false);
        expect(bonus.opacity).toBe(0.5);
    });
});

describe('Stacked Bonus', () => {
    beforeEach(() => {
        BonusManager.assets.BonusSelfFast = { name: 'fast-asset' };
    });

    afterEach(() => {
        delete BonusManager.assets.BonusSelfFast;
    });

    it('picks its asset from the bonus manager', () => {
        const bonus = new StackedBonus(3, 'BonusSelfFast', 5000);

        expect(bonus.id).toBe(3);
        expect(bonus.duration).toBe(5000);
        expect(bonus.asset).toEqual({ name: 'fast-asset' });
        expect(bonus.changed).toBe(true);
        expect(bonus.opacity).toBe(1);
        bonus.clear();
    });

    it('blinks and announces changes once the warning starts', () => {
        const bonus = new StackedBonus(1, 'BonusSelfFast', 3000);
        const changes: any[] = [];

        bonus.on('change', (event) => changes.push(event));
        bonus.setEndingTimeout(1000);

        vi.advanceTimersByTime(1999);
        expect(bonus.opacity).toBe(1);

        vi.advanceTimersByTime(1);
        vi.advanceTimersByTime(100);
        expect(bonus.opacity).toBe(0.5);

        vi.advanceTimersByTime(100);
        expect(bonus.opacity).toBe(1);

        expect(changes).toHaveLength(2);
        expect(changes[0].type).toBe('change');

        bonus.clear();

        vi.advanceTimersByTime(1000);
        expect(changes).toHaveLength(2);
    });

    it('forgets its timers when cleared', () => {
        const bonus = new StackedBonus(1, 'BonusSelfFast', 5000);

        bonus.setEndingTimeout(1000);
        bonus.clear();

        expect(bonus.timeout).toBeUndefined();

        vi.advanceTimersByTime(10000);
        expect(bonus.opacity).toBe(1);
    });
});

describe('Map Bonus', () => {
    beforeEach(() => {
        BonusManager.assets.BonusSelfFast = { name: 'fast-asset' };
    });

    afterEach(() => {
        delete BonusManager.assets.BonusSelfFast;
    });

    it('starts small at its position, with its asset', () => {
        const bonus = new MapBonus(7, 10, 20, 'BonusSelfFast');

        expect(bonus.id).toBe(7);
        expect(bonus.x).toBe(10);
        expect(bonus.y).toBe(20);
        expect(bonus.radius).toBe(3);
        expect(bonus.asset).toEqual({ name: 'fast-asset' });
        expect(bonus.changed).toBe(true);
        expect(bonus.animation.done).toBe(false);
        expect(bonus.drawRadius).toBeCloseTo(0);
    });

    it('grows to its full size when the animation ends', () => {
        const bonus = new MapBonus(7, 10, 20, 'BonusSelfFast');

        vi.advanceTimersByTime(300);

        expect(bonus.animation.done).toBe(true);
        expect(bonus.animation.timeout).toBeUndefined();

        bonus.update();

        expect(bonus.drawRadius).toBeCloseTo(3);
        expect(bonus.drawWidth).toBeCloseTo(6);
        expect(bonus.drawX).toBeCloseTo(7);
        expect(bonus.drawY).toBeCloseTo(17);
    });
});
