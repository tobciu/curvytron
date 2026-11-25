/**
 * The room tag carried by the URL (`#/room/<name>?tag=daily`), for a room as a bookmarkable favorite.
 */
import type { LocationQueryRaw } from 'vue-router';
import { normalizeTag } from '../shared/tag';

/**
 * The tag of the URL, cleaned. Something unreadable (e.g. an array, a number) means no tag.
 */
export function getUrlTag(query: LocationQueryRaw): string | null {
    return normalizeTag(query.tag);
}

/**
 * The query to keep when the room tag changes: the same query, with the tag of the room (or without the key).
 * The other keys (e.g. the password) are kept.
 */
export function urlWithTag(query: LocationQueryRaw, tag: string | null): LocationQueryRaw {
    const { tag: _dropped, ...rest } = query;

    return tag ? { ...rest, tag } : rest;
}
