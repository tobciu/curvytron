/**
 * What the server recognizes this page by, after a reload or a lost connection:
 * - the token belongs to the browser, so it survives a closed tab or a restart of the browser
 * - the tab belongs to the tab, so that two tabs of the same browser stay two clients
 */
export interface Session {
    token: string;
    tab: string;
}

const TOKEN_KEY = 'curvytron.token';
const TAB_KEY = 'curvytron.tab';
const IDENTITY_KEY = 'curvytron.identity';

function randomId(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }

    return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join('');
}

/** Read the id from the storage, create and store it when there is none; storage may be blocked or full */
function stored(storage: () => Storage, key: string, fallback: { value?: string }): string {
    try {
        const area = storage();
        let id = area.getItem(key);

        if (!id) {
            id = randomId();
            area.setItem(key, id);
        }

        return id;
    } catch {
        fallback.value ??= randomId();

        return fallback.value;
    }
}

const tokenFallback: { value?: string } = {};
const tabFallback: { value?: string } = {};
const identityFallback: { value?: string } = {};

/**
 * Who this browser is for the statistics: a secret code, kept like the token but sent differently (as a message once
 * connected, never in the address of the socket, where proxies log it). Whoever knows the code is this player.
 */
export function getIdentity(): string {
    return stored(() => globalThis.localStorage, IDENTITY_KEY, identityFallback);
}

/** What a code looks like (the server checks it the same way) */
export const identityCodePattern = /^[\w-]{16,64}$/;

export function isIdentityCode(code: string): boolean {
    return identityCodePattern.test(code);
}

/** A new random code, not yet used for anything */
export function newIdentityCode(): string {
    return randomId();
}

/**
 * Be another player from now on: a code from another browser, or a new one. The page has to be loaded again, the server
 * knows the old code from the connection.
 */
export function setIdentity(code: string): void {
    identityFallback.value = code;

    try {
        globalThis.localStorage.setItem(IDENTITY_KEY, code);
    } catch {
        // Without a storage the code lives as long as the page
    }
}

export function getSession(): Session {
    return {
        token: stored(() => globalThis.localStorage, TOKEN_KEY, tokenFallback),
        tab: stored(() => globalThis.sessionStorage, TAB_KEY, tabFallback)
    };
}
