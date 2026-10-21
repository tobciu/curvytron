/**
 * jsdom has no canvas implementation: getContext() returns null. Replace it with a recording
 * stand-in so that client models which draw (Avatar, Game, Canvas) can be constructed in tests.
 */
function fakeContext(): any {
    const values: Record<string, unknown> = {};

    return new Proxy(values, {
        get(target, property) {
            if (property in target || typeof property === 'symbol') {
                return target[property as string];
            }

            // Unknown members are treated as methods returning chainable stand-ins (gradients, …)
            return () => fakeContext();
        },
        set(target, property, value) {
            target[property as string] = value;

            return true;
        }
    });
}

HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return fakeContext();
} as typeof HTMLCanvasElement.prototype.getContext;
