import { onScopeDispose, ref, shallowRef, triggerRef, type Ref, type ShallowRef } from 'vue';
import type { Emitter } from '../types';

/**
 * Bridge between the game model and Vue.
 *
 * The model is made of plain mutable objects that announce changes with events. Vue can not see them,
 * so views read the model through a "version": every listed event (or manual `bump()`) increments it,
 * which makes the views that read `version.value` render again.
 */
export function useVersion(): { version: Ref<number>; bump: () => void } {
    const version = ref(0);

    return { version, bump: () => void version.value++ };
}

/** Run `handler` every time one of the `events` is emitted, until the current scope is disposed. */
export function useEvents(emitter: Emitter, events: string[], handler: (event: any, name: string) => void): void {
    const listeners = events.map((name) => [name, (event: unknown) => handler(event, name)] as const);

    for (const [name, listener] of listeners) {
        emitter.on(name, listener);
    }

    onScopeDispose(() => {
        for (const [name, listener] of listeners) {
            emitter.off(name, listener);
        }
    });
}

/** `useVersion` + `useEvents`: the returned version changes whenever one of the events is emitted. */
export function useEmitterVersion(emitter: Emitter, events: string[]): { version: Ref<number>; bump: () => void } {
    const state = useVersion();

    useEvents(emitter, events, state.bump);

    return state;
}

/**
 * Make a plain model object usable in a template.
 *
 * The returned ref holds the (non reactive) model itself: templates reading it render again each time one of
 * the events is emitted or `bump()` is called.
 */
export function useLive<T extends object>(
    model: T,
    emitter?: Emitter,
    events: string[] = []
): { live: ShallowRef<T>; bump: () => void } {
    const live = shallowRef(model) as ShallowRef<T>;
    const bump = () => triggerRef(live);

    if (emitter) {
        useEvents(emitter, events, bump);
    }

    return { live, bump };
}
