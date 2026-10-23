/**
 * A random number from 0 up to, but not including, 1. It comes from the secure generator, like the passwords of the
 * rooms: the game does not need that, but nothing has to be reviewed for it either (SonarQube S2245).
 */
export function randomUnit(): number {
    const [value] = globalThis.crypto.getRandomValues(new Uint32Array(1));

    return value / 2 ** 32;
}
