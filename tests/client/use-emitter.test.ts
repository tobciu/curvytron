import { describe, expect, it, vi } from 'vitest';
import { effectScope, watch } from 'vue';
import { EventEmitter } from '../../src/client/EventEmitter.ts';
import { useVersion, useEvents, useEmitterVersion, useLive } from '../../src/client/composables/useEmitter.ts';

describe('useVersion', () => {
    it('starts at zero and counts the bumps', () => {
        const { version, bump } = useVersion();

        expect(version.value).toBe(0);

        bump();
        bump();

        expect(version.value).toBe(2);
    });
});

describe('useEvents', () => {
    it('calls the handler with the event and its name, for every listed event', () => {
        const emitter = new EventEmitter();
        const handler = vi.fn();

        const scope = effectScope();

        scope.run(() => {
            useEvents(emitter, ['move', 'die'], handler);
        });

        emitter.emit('move', { x: 1 });
        emitter.emit('die', null);
        emitter.emit('other', 'ignored');

        expect(handler).toHaveBeenCalledTimes(2);
        expect(handler).toHaveBeenNthCalledWith(1, { type: 'move', detail: { x: 1 } }, 'move');
        expect(handler).toHaveBeenNthCalledWith(2, { type: 'die', detail: null }, 'die');
    });

    it('unsubscribes when the scope stops', () => {
        const emitter = new EventEmitter();
        const handler = vi.fn();

        const scope = effectScope();

        scope.run(() => {
            useEvents(emitter, ['move'], handler);
        });

        scope.stop();
        emitter.emit('move');

        expect(handler).not.toHaveBeenCalled();
        expect(emitter._events['move']).toBeUndefined();
    });
});

describe('useEmitterVersion', () => {
    it('the version moves on every listed event and on a manual bump', () => {
        const emitter = new EventEmitter();
        let state: ReturnType<typeof useEmitterVersion> = null as never;

        const scope = effectScope();

        scope.run(() => {
            state = useEmitterVersion(emitter, ['chat', 'move']);
        });

        emitter.emit('chat');
        emitter.emit('move');

        expect(state.version.value).toBe(2);

        state.bump();

        expect(state.version.value).toBe(3);
    });

    it('stops counting when the scope stops', () => {
        const emitter = new EventEmitter();
        let state: ReturnType<typeof useEmitterVersion> = null as never;

        const scope = effectScope();

        scope.run(() => {
            state = useEmitterVersion(emitter, ['chat']);
        });

        emitter.emit('chat');
        scope.stop();
        emitter.emit('chat');

        // the listeners are gone, but a manual bump still works
        state.bump();

        expect(state.version.value).toBe(2);
    });

    it('re-renders an effect that reads the version', () => {
        const emitter = new EventEmitter();
        const renders = vi.fn();
        let version: { value: number } = null as never;

        const scope = effectScope();

        scope.run(() => {
            version = useEmitterVersion(emitter, ['move']).version;
            watch(version, renders, { flush: 'sync' });
        });

        emitter.emit('move');

        expect(renders).toHaveBeenCalledTimes(1);
        expect(version.value).toBe(1);

        scope.stop();
        emitter.emit('move');

        expect(renders).toHaveBeenCalledTimes(1);
    });
});

describe('useLive', () => {
    it('holds the model itself and re-renders on a manual bump', () => {
        const model = { score: 0 };
        const rerenders = vi.fn();

        const scope = effectScope();
        let live: { value: typeof model } = null as never;
        let bump: () => void = null as never;

        scope.run(() => {
            ({ live, bump } = useLive(model));
            watch(live, rerenders, { flush: 'sync' });
        });

        expect(live.value).toBe(model);

        model.score = 10;
        bump();

        expect(live.value).toBe(model);
        expect(rerenders).toHaveBeenCalledTimes(1);
    });

    it('bumps when the emitter emits one of the events, until the scope stops', () => {
        const emitter = new EventEmitter();
        const model = { name: 'room' };
        const rerenders = vi.fn();

        const scope = effectScope();
        let live: { value: typeof model } = null as never;

        scope.run(() => {
            ({ live } = useLive(model, emitter, ['room:update']));
            watch(live, rerenders, { flush: 'sync' });
        });

        emitter.emit('room:update');

        expect(rerenders).toHaveBeenCalledTimes(1);

        emitter.emit('other');

        expect(rerenders).toHaveBeenCalledTimes(1);

        scope.stop();
        emitter.emit('room:update');

        expect(rerenders).toHaveBeenCalledTimes(1);
        expect(live.value).toBe(model);
    });
});
