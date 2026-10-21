import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Room } from '../../src/client/model/Room.ts';
import { Game } from '../../src/client/model/Game.ts';
import { Player } from '../../src/client/model/Player.ts';
import { StackedBonus } from '../../src/client/model/bonus/StackedBonus.ts';
import { Collection } from '../../src/shared/Collection.ts';

let room: Room;
let game: any;
let frameId: number;
let rafFrames: number[];
let cancelled: number[];

function addPlayer(id: number, local: boolean) {
    const client: any = { id: 1, players: new Collection() };
    const player = new Player(id, client, `Player ${id}`, '#ff0000', true);

    if (local) {
        player.setLocal(true);
    }

    room.addPlayer(player);

    return player;
}

function startGame() {
    room = new Room('test');

    addPlayer(1, true);
    addPlayer(2, false);

    game = room.newGame();
    game.loadDOM();

    return game;
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Touch', class Touch {});
    vi.stubGlobal('innerWidth', 800);
    vi.stubGlobal('innerHeight', 600);

    frameId = 0;
    rafFrames = [];
    cancelled = [];

    vi.stubGlobal(
        'requestAnimationFrame',
        vi.fn(() => {
            frameId += 1;
            rafFrames.push(frameId);

            return frameId;
        })
    );
    vi.stubGlobal(
        'cancelAnimationFrame',
        vi.fn((frame: number) => {
            cancelled.push(frame);
        })
    );

    document.body.innerHTML = `
        <div id="render"></div>
        <div id="game-infos"></div>
        <canvas id="game"></canvas>
        <canvas id="background"></canvas>
        <canvas id="effect"></canvas>
        <canvas id="bonus"></canvas>
    `;
});

afterEach(() => {
    if (game) {
        game.stop();
        game.fps.stop();
        globalThis.removeEventListener('error', game.stop);
        globalThis.removeEventListener('resize', game.onResize);
        game.avatars.items.forEach((avatar: any) => avatar.destroy());
        game = null;
    }

    room = null as any;
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('Client Game', () => {
    it('starts with an avatar for every player of the room', () => {
        game = startGame();

        expect(game).toBeInstanceOf(Game);
        expect(game.name).toBe('test');
        expect(game.avatars.count()).toBe(2);
        expect(game.size).toBe(88);
        expect(game.started).toBe(false);
        expect(game.inRound).toBe(false);
        expect(game.borderless).toBe(false);
    });

    it('is ready when every avatar is loaded', () => {
        game = startGame();

        expect(game.isReady()).toBe(false);

        game.avatars.items[0].ready = true;
        expect(game.isReady()).toBe(false);

        game.avatars.items.forEach((avatar: any) => (avatar.ready = true));
        expect(game.isReady()).toBe(true);

        game.started = true;
        expect(game.isReady()).toBe(true);
    });

    it('detects a tie break once an avatar reached the max score', () => {
        game = startGame();
        game.maxScore = 10;

        expect(game.isTieBreak()).toBe(false);

        game.avatars.items[0].score = 10;
        expect(game.isTieBreak()).toBe(true);
    });

    it('sizes its canvases to the window when loading the DOM', () => {
        game = startGame();

        expect(game.render.style.width).toBe('600px');
        expect(game.render.style.height).toBe('600px');
        expect(game.canvas.element.width).toBe(592);
        expect(game.background.element.width).toBe(592);
        expect(game.effect.element.width).toBe(592);
        expect(game.bonusManager.canvas.element.width).toBe(592);

        const scale = 592 / game.size;

        expect(game.canvas.scale).toBe(scale);
        expect(game.avatars.items[0].canvas.scale).toBe(scale);
        expect(game.avatars.items[1].canvas.element.width).toBe(Math.ceil(1.2 * scale));
        expect(game.avatars.items[0].input.width).toBe(800);
    });

    it('resizes when the window resizes', () => {
        game = startGame();

        vi.stubGlobal('innerWidth', 500);
        vi.stubGlobal('innerHeight', 400);

        globalThis.dispatchEvent(new Event('resize'));

        expect(game.canvas.element.width).toBe(392);
        expect(game.canvas.scale).toBeCloseTo(392 / game.size);
        expect(game.avatars.items[0].input.width).toBe(500);
    });

    it('clears its trails by repainting the background', () => {
        game = startGame();

        game.clearTrails();

        expect(game.background.context.fillStyle).toBe('#222222');
    });

    it('sets the borderless flag', () => {
        game = startGame();

        game.setBorderless(true);
        expect(game.borderless).toBe(true);

        game.newRound(10);
        vi.advanceTimersByTime(10);
        expect(game.borderless).toBe(false);
    });

    it('starts the loop at the round, with the avatars ready again', () => {
        game = startGame();

        const avatar = game.avatars.items[0];

        avatar.die();
        game.newRound(10);

        expect(game.started).toBe(true);
        expect(game.inRound).toBe(true);
        expect(avatar.alive).toBe(true);
        expect(game.frame).toBeNull();

        vi.advanceTimersByTime(10);

        expect(rafFrames).toHaveLength(1);
        expect(game.frame).toBe(1);

        game.draw(16);

        expect(avatar.x).toBeCloseTo(0.6 + 16 * (avatar.velocity / 1000));

        game.endRound();
        vi.advanceTimersByTime(game.warmdownTime);

        expect(game.inRound).toBe(false);
        expect(cancelled).toEqual([1]);
        expect(game.frame).toBeNull();
    });

    it('draws the avatars, their trails and their stacks outside of the loop', () => {
        game = startGame();

        const avatar = game.avatars.items[0];

        avatar.trail.addPoint(1, 1);
        avatar.trail.addPoint(1.5, 1.5);
        avatar.bonusStack.add(new StackedBonus(1, 'BonusSelfFast', 5000));

        game.draw(0);

        // Trail drawn, head drawn, stack drawn, arrow drawn for the local avatar
        expect(avatar.changed).toBe(false);
        expect(avatar.clearX).toBe(avatar.startX);
        expect(avatar.clearWidth).toBe(avatar.canvas.element.width);
        expect(avatar.bonusStack.lastWidth).toBe(20);

        // The second pass clears the zone of the previous stack
        game.draw(0);

        expect(avatar.bonusStack.lastWidth).toBe(20);
    });

    it('ignores avatars that are gone or dead without changes', () => {
        game = startGame();

        const dead = game.avatars.items[1];

        dead.die();
        dead.changed = false;
        game.avatars.items[0].present = false;

        const clearAvatar = vi.spyOn(game, 'clearAvatar');

        game.draw(0);

        expect(clearAvatar).not.toHaveBeenCalled();
    });

    it('explodes an avatar that dies, and forgets the finished animation', () => {
        game = startGame();

        game.avatars.items[0].die();

        expect(game.animations).toHaveLength(1);

        game.draw(0);
        expect(game.animations).toHaveLength(1);

        vi.advanceTimersByTime(600);
        game.draw(0);

        expect(game.animations).toHaveLength(0);
    });

    it('drops finished animations on a repaint', () => {
        game = startGame();

        game.animations.push({ draw: vi.fn(), done: true, cleared: true });

        expect(game.repaint()).toBeUndefined();
        expect(game.animations).toHaveLength(0);
    });

    it('resizes everything when the size of the map changes', () => {
        game = startGame();

        const setSize = vi.spyOn(game, 'onResize');

        game.setSize();

        expect(setSize).toHaveBeenCalled();

        // Put the original bound method back, so afterEach can detach the listener
        setSize.mockRestore();
    });

    it('kills and destroys a removed avatar', () => {
        game = startGame();

        const avatar = game.avatars.items[1];

        expect(game.avatars.exists(avatar)).toBe(true);

        game.removeAvatar(avatar);

        expect(avatar.alive).toBe(false);
        expect(avatar.present).toBe(false);
    });

    it('ignores the removal of an avatar that is not in the game', () => {
        game = startGame();

        const outsider = new (class {} as any)();

        expect(() => game.removeAvatar(outsider)).not.toThrow();
    });

    it('ends once, closing the game of the room', () => {
        game = startGame();

        game.newRound(10);
        vi.advanceTimersByTime(10);

        expect(game.end()).toBe(true);
        expect(game.end()).toBe(false);
        expect(room.game).toBeUndefined();
        expect(rafFrames).toHaveLength(1);
        expect(cancelled).toEqual([1]);

        // The global listeners are gone: nothing breaks when they fire again
        globalThis.dispatchEvent(new Event('resize'));
        globalThis.dispatchEvent(new Event('error'));
    });

    it('stops the loop on a global error', () => {
        game = startGame();

        game.newRound(10);
        vi.advanceTimersByTime(10);

        expect(game.frame).toBe(1);

        globalThis.dispatchEvent(new Event('error'));

        expect(game.frame).toBeNull();
        expect(cancelled).toEqual([1]);
    });

    it('does nothing when stopping a game that never started', () => {
        game = startGame();

        expect(() => game.stop()).not.toThrow();
        expect(game.frame).toBeNull();
        expect(cancelled).toHaveLength(0);
    });
});
