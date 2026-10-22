/** Longest tag of a room, after cleaning it */
export const tagMaxLength = 24;

/**
 * The tag groups the games of a room by an occasion ("daily", "launch"): lower case letters, digits and dashes.
 * "Daily Runde" becomes "daily-runde". Nothing left (or nothing given) means no tag.
 */
export function normalizeTag(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const tag = value
        .toLowerCase()
        .replaceAll(/[\s_]+/g, '-')
        .replaceAll(/[^a-z0-9-]/g, '')
        .replaceAll(/-{2,}/g, '-')
        .slice(0, tagMaxLength)
        .replaceAll(/^-+|-+$/g, '');

    return tag === '' ? null : tag;
}
