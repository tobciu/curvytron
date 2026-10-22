import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getIdentity, isIdentityCode, newIdentityCode, setIdentity } from '../../src/client/core/session.ts';

describe('the identity code of the browser', () => {
    beforeEach(() => {
        globalThis.localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('is made once, kept, and looks like a code', () => {
        const code = getIdentity();

        expect(isIdentityCode(code)).toBe(true);
        expect(getIdentity()).toBe(code);
        expect(globalThis.localStorage.getItem('curvytron.identity')).toBe(code);
    });

    it('can be set to the code of another browser, and then stays', () => {
        setIdentity('a-code-from-another-browser');

        expect(getIdentity()).toBe('a-code-from-another-browser');
    });

    it('is different from the token of the session, which goes in the address of the socket', () => {
        getIdentity();

        expect(globalThis.localStorage.getItem('curvytron.token')).not.toBe(getIdentity());
    });

    it('gives new codes that are all different, and recognizes what is no code', () => {
        const codes = new Set(Array.from({ length: 20 }, () => newIdentityCode()));

        expect(codes.size).toBe(20);
        expect([...codes].every(isIdentityCode)).toBe(true);

        for (const nothing of ['', 'short', 'x'.repeat(65), 'with space in it 0123456', 'ünïcode-0123456789abc']) {
            expect(isIdentityCode(nothing)).toBe(false);
        }
    });

    it('lives as long as the page when the storage is blocked', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });

        const code = getIdentity();

        expect(isIdentityCode(code)).toBe(true);
        expect(getIdentity()).toBe(code);

        setIdentity('another-code-0123456789');

        expect(getIdentity()).toBe('another-code-0123456789');
    });
});
