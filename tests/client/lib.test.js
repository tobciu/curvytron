import { describe, expect, it } from 'vitest';
import { OptionResolver } from '../../src/client/lib/OptionResolver.ts';
import { KeyboardMapper } from '../../src/client/lib/KeyboardMapper.ts';
import { GamepadMapper } from '../../src/client/lib/GamepadMapper.ts';
import { TouchMapper } from '../../src/client/lib/TouchMapper.ts';
import { GamepadHandler } from '../../src/client/lib/GamepadHandler.ts';

describe('OptionResolver', () => {
    const resolver = () => new OptionResolver().setDefaults({ size: 3, name: 'x' }).setTypes({ size: 'number' });

    it('gives the defaults, and what the source overrides', () => {
        expect(resolver().resolve({})).toEqual({ size: 3, name: 'x' });
        expect(resolver().resolve({ size: 5 })).toEqual({ size: 5, name: 'x' });
    });

    it('converts the values to the expected type, and refuses what it can not convert (a type that is none of the basic ones)', () => {
        expect(resolver().resolve({ size: '7' }).size).toBe(7);
        const strict = new OptionResolver().setDefaults({ size: 1 }).setTypes({ size: 'object' });

        expect(() => strict.resolve({ size: 5 })).toThrow();
    });

    it('knows the optional options, and refuses the unknown ones', () => {
        const optional = resolver().setOptional(['color']);

        expect(optional.optionExists('color')).toBe(true);
        expect(optional.optionExists('size')).toBe(true);
        expect(optional.optionExists('other')).toBe(false);
        expect(() => optional.getValue({ other: 1 }, 'other')).toThrow('Unkown option');
    });

    it('requires the required options', () => {
        const required = new OptionResolver().setRequired(['id']);

        expect(() => required.resolve({})).toThrow();
    });

    it('accepts anything with allowExtra', () => {
        expect(new OptionResolver(true).optionExists('anything')).toBe(true);
    });
});

describe('mappers', () => {
    it('names the keys', () => {
        const mapper = new KeyboardMapper();

        expect(mapper.guessChar(37)).toBe('←');
        expect(mapper.guessChar(32)).toBe('Space');
        expect(mapper.guessChar(65)).toBe('A');
    });

    it('names the gamepad inputs', () => {
        const mapper = new GamepadMapper({ on() {}, off() {} });

        expect(mapper.guessChar('axis:0:-1')).toBe('Stick ←');
        expect(mapper.guessChar('gamepad:1:axis:1:1')).toBe('Stick ↓');
        expect(mapper.guessChar('button:3')).toBe('Button (3)');
    });

    it('starts and stops listening once, and tells it', () => {
        const mapper = new TouchMapper();
        const events = [];

        mapper.on('listening:start', () => events.push('start'));
        mapper.on('listening:stop', () => events.push('stop'));

        expect(mapper.start()).toBe(true);
        expect(mapper.start()).toBe(false);
        expect(mapper.stop()).toBe(true);
        expect(mapper.stop()).toBe(false);
        expect(events).toEqual(['start', 'stop']);
    });

    it('stores a value, and its view, when it changes', () => {
        const mapper = new KeyboardMapper();
        const changes = [];

        mapper.on('change', (event) => changes.push(event.detail));
        mapper.setValue(39);
        mapper.setValue(39);

        expect(changes).toEqual([{ value: 39, view: '→' }]);
    });
});

describe('GamepadHandler', () => {
    it('resolves the options of the sticks and the buttons', () => {
        const gamepad = { axes: [0, 0], buttons: [] };
        const handler = new GamepadHandler(gamepad, { deadZone: 0.4, analog: false });

        expect(handler.options.stick.deadZone).toBe(0.4);
        expect(handler.options.button.analog).toBe(false);
        expect(new GamepadHandler(gamepad).options.stick).toEqual({ analog: true, deadZone: 0, precision: 0 });
    });
});
