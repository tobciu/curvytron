import { describe, expect, it } from 'vitest';
import { getUrlTag, urlWithTag } from '../../src/client/url.ts';

describe('getUrlTag', () => {
    it('reads the tag of the url, and cleans it', () => {
        expect(getUrlTag({ tag: 'Daily Runde' })).toBe('daily-runde');
        expect(getUrlTag({ tag: 'launch' })).toBe('launch');
    });

    it('ignores an empty, missing or unreadable tag', () => {
        expect(getUrlTag({})).toBeNull();
        expect(getUrlTag({ tag: '' })).toBeNull();
        expect(getUrlTag({ tag: '!!!' })).toBeNull();
        expect(getUrlTag({ tag: ['daily'] })).toBeNull();
        expect(getUrlTag({ tag: 42 })).toBeNull();
    });
});

describe('urlWithTag', () => {
    it('carries the tag of the room, keeping the other keys', () => {
        expect(urlWithTag({ password: '1234' }, 'daily')).toEqual({ password: '1234', tag: 'daily' });
        expect(urlWithTag({ tag: 'old', password: '1234' }, 'daily')).toEqual({ password: '1234', tag: 'daily' });
    });

    it('drops the key when the room has no tag', () => {
        expect(urlWithTag({ tag: 'old', password: '1234' }, null)).toEqual({ password: '1234' });
        expect(urlWithTag({ password: '1234' }, null)).toEqual({ password: '1234' });
    });
});
