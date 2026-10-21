import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerInput } from '../../src/client/model/PlayerInput.ts';
import { gamepadListener } from '../../src/client/gamepadListener.ts';

class TouchStub {
    identifier: number;

    constructor({ identifier }: { identifier: number }) {
        this.identifier = identifier;
    }
}

// jsdom has no Touch class, and PlayerInput.getBindingType checks `binding instanceof Touch`
globalThis.Touch = TouchStub as unknown as typeof Touch;

const avatar = { local: true };

let inputs: PlayerInput[] = [];

function createInput(binding?: unknown[]): PlayerInput {
    const input = new PlayerInput(avatar, binding);

    inputs.push(input);

    return input;
}

afterEach(() => {
    for (const input of inputs) {
        input.detachEvents();
    }

    inputs = [];
});

function keyEvent(type: string, keyCode: number) {
    globalThis.dispatchEvent(new KeyboardEvent(type, { keyCode }));
}

function touchEvent(type: string, positions: number[]) {
    globalThis.dispatchEvent(Object.assign(new Event(type), { touches: positions.map((screenX) => ({ screenX })) }));
}

function movesOf(input: PlayerInput) {
    const moves: { avatar: unknown; move: number | boolean }[] = [];

    input.on('move', (event: { detail: { avatar: unknown; move: number | boolean } }) => moves.push(event.detail));

    return moves;
}

describe('PlayerInput (keyboard)', () => {
    it('binds the arrow keys by default', () => {
        const input = createInput();

        expect(input.binding).toEqual([37, 39]);
        expect(input.key).toBe(false);
        expect(input.active).toEqual([false, false]);
        expect(input.move).toBe(0);
        expect(input.width).toBe(0);
        expect(input.useGamepad()).toBe(false);
    });

    it('turns left when the first key is pressed, and back when released', () => {
        const input = createInput();
        const moves = movesOf(input);

        keyEvent('keydown', 37);

        expect(input.active).toEqual([true, false]);
        expect(moves).toEqual([{ avatar, move: -1 }]);

        keyEvent('keyup', 37);

        expect(input.active).toEqual([false, false]);
        expect(moves.at(-1)).toEqual({ avatar, move: false });
    });

    it('turns right when the second key is pressed', () => {
        const input = createInput();
        const moves = movesOf(input);

        keyEvent('keydown', 39);

        expect(input.active).toEqual([false, true]);
        expect(moves).toEqual([{ avatar, move: 1 }]);
    });

    it('stays straight when both keys are pressed, and stops moving when both are released', () => {
        const input = createInput();
        const moves = movesOf(input);

        keyEvent('keydown', 37);
        keyEvent('keydown', 39);

        expect(input.active).toEqual([true, true]);
        expect(moves.at(-1)).toEqual({ avatar, move: false });

        keyEvent('keyup', 37);
        keyEvent('keyup', 39);

        expect(moves.at(-1)).toEqual({ avatar, move: false });
    });

    it('ignores keys that are not bound', () => {
        const input = createInput();
        const moves = movesOf(input);

        keyEvent('keydown', 65);
        keyEvent('keyup', 65);

        expect(input.active).toEqual([false, false]);
        expect(moves).toEqual([]);
    });

    it('does not emit the same move twice', () => {
        const input = createInput();
        const moves = movesOf(input);

        keyEvent('keydown', 37);
        keyEvent('keydown', 37);

        expect(moves).toEqual([{ avatar, move: -1 }]);
    });

    it('stops reacting once detached', () => {
        const input = createInput();
        const moves = movesOf(input);

        input.detachEvents();
        keyEvent('keydown', 37);

        expect(input.active).toEqual([false, false]);
        expect(moves).toEqual([]);
    });
});

describe('PlayerInput (gamepad)', () => {
    const buttons = ['gamepad:0:button:0', 'gamepad:0:button:1'];
    const axes = ['gamepad:0:axis:0:-1', 'gamepad:0:axis:0:1'];

    it('knows a gamepad binding is a gamepad, and names its type', () => {
        const input = createInput(buttons);

        expect(input.useGamepad()).toBe(true);
        expect(input.getBindingType('gamepad:0:button:3')).toBe('gamepad:0:button:3');
        expect(input.getBindingType('gamepad:2:axis:1')).toBe('gamepad:2:axis:1');
        expect(input.getBindingType('37')).toBe('keyboard');
        expect(input.getBindingType('not a gamepad')).toBe('keyboard');
    });

    it('presses and releases through bound buttons', () => {
        const input = createInput(buttons);
        const moves = movesOf(input);

        gamepadListener.emit('gamepad:0:button:0', { gamepad: { index: 0 }, index: 0, pressed: true });

        expect(input.active).toEqual([true, false]);
        expect(moves).toEqual([{ avatar, move: -1 }]);

        gamepadListener.emit('gamepad:0:button:1', { gamepad: { index: 0 }, index: 1, pressed: true });

        expect(input.active).toEqual([true, true]);
        expect(moves.at(-1)).toEqual({ avatar, move: false });

        gamepadListener.emit('gamepad:0:button:0', { gamepad: { index: 0 }, index: 0, pressed: false });

        expect(input.active).toEqual([false, true]);
        expect(moves.at(-1)).toEqual({ avatar, move: 1 });
    });

    it('ignores an event whose gamepad index does not match a binding', () => {
        const input = createInput(buttons);
        const moves = movesOf(input);

        gamepadListener.emit('gamepad:0:button:0', { gamepad: { index: 1 }, index: 0, pressed: true });

        expect(input.active).toEqual([false, false]);
        expect(moves).toEqual([]);
    });

    it('activates on an exact axis position and deactivates the axis on any other value', () => {
        const input = createInput(axes);
        const moves = movesOf(input);

        gamepadListener.emit('gamepad:0:axis:0', { gamepad: { index: 0 }, axis: 0, value: -1 });

        expect(input.active).toEqual([true, false]);
        expect(moves).toEqual([{ avatar, move: -1 }]);

        gamepadListener.emit('gamepad:0:axis:0', { gamepad: { index: 0 }, axis: 0, value: 0 });

        expect(input.active).toEqual([false, false]);
        expect(moves.at(-1)).toEqual({ avatar, move: false });

        gamepadListener.emit('gamepad:0:axis:0', { gamepad: { index: 0 }, axis: 0, value: 1 });

        expect(input.active).toEqual([false, true]);
        expect(moves.at(-1)).toEqual({ avatar, move: 1 });

        gamepadListener.emit('gamepad:0:axis:0', { gamepad: { index: 0 }, axis: 0, value: 0.5 });

        expect(input.active).toEqual([false, false]);
        expect(moves.at(-1)).toEqual({ avatar, move: false });
    });

    it('keeps the bindings untouched when the axis does not match any of them', () => {
        const input = createInput(axes);
        const moves = movesOf(input);

        gamepadListener.emit('gamepad:0:axis:0', { gamepad: { index: 2 }, axis: 5, value: -1 });

        expect(input.active).toEqual([false, false]);
        expect(moves).toEqual([]);
    });

    it('stops hearing the gamepad once detached', () => {
        const input = createInput(buttons);
        const moves = movesOf(input);

        input.detachEvents();
        gamepadListener.emit('gamepad:0:button:0', { gamepad: { index: 0 }, index: 0, pressed: true });

        expect(input.active).toEqual([false, false]);
        expect(moves).toEqual([]);
    });
});

describe('PlayerInput (touch)', () => {
    const left = new TouchStub({ identifier: 1 });
    const right = new TouchStub({ identifier: 2 });

    it('recognises touch bindings as the touch type', () => {
        const input = createInput([left, right]);

        expect(input.getBindingType(left as unknown as string)).toBe('touch');
        expect(input.useGamepad()).toBe(false);
    });

    it('moves with the touches on each side of the middle', () => {
        const input = createInput([left, right]);
        const moves = movesOf(input);

        input.setWidth(100);

        touchEvent('touchstart', [10, 60]);

        expect(input.active).toEqual([true, true]);
        expect(moves.at(-1)).toEqual({ avatar, move: false });

        touchEvent('touchstart', [10]);

        expect(input.active).toEqual([true, false]);
        expect(moves.at(-1)).toEqual({ avatar, move: -1 });

        touchEvent('touchend', []);

        expect(input.active).toEqual([false, false]);
        expect(moves.at(-1)).toEqual({ avatar, move: false });
    });

    it('counts a touch exactly at the middle as a right touch', () => {
        const input = createInput([left, right]);
        const moves = movesOf(input);

        input.setWidth(100);
        touchEvent('touchstart', [50]);

        expect(input.active).toEqual([false, true]);
        expect(moves).toEqual([{ avatar, move: 1 }]);
    });

    it('stops reacting to touches once detached', () => {
        const input = createInput([left, right]);
        const moves = movesOf(input);

        input.setWidth(100);
        input.detachEvents();
        touchEvent('touchstart', [10]);

        expect(input.active).toEqual([false, false]);
        expect(moves).toEqual([]);
    });
});

describe('PlayerInput (direct API)', () => {
    it('emits the move with the avatar', () => {
        const input = createInput();
        const moves = movesOf(input);

        input.setMove(1);

        expect(input.move).toBe(1);
        expect(moves).toEqual([{ avatar, move: 1 }]);
    });

    it('accepts an empty binding without listening to anything', () => {
        const input = createInput([]);
        const keydown = vi.fn();

        globalThis.addEventListener('keydown', keydown);
        keyEvent('keydown', 37);
        globalThis.removeEventListener('keydown', keydown);

        expect(input.useGamepad()).toBe(false);
        expect(input.active).toEqual([false, false]);
        expect(keydown).toHaveBeenCalled();
    });
});
