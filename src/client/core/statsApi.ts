import { asset } from '../assets';
import { getIdentity } from './session';
import type {
    ApiGameDetail,
    ApiGames,
    ApiLeaderboard,
    ApiMe,
    ApiRecords,
    ApiTags,
    LeaderboardBy
} from '../../shared/model/StatsApi';

/** The server answers that the games are not kept (the storage is off) */
export class NotKeptError extends Error {}

/**
 * Ask the statistics of the server. The identity code goes in the header, so that the answers know who asks: the own
 * name is shown, the own feats are known. It is not sent anywhere else.
 */
async function request<T>(
    method: string,
    path: string,
    params: Record<string, string | number | null | undefined> = {},
    options: { body?: unknown; identity?: string } = {}
): Promise<T> {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined && value !== '') {
            query.set(key, String(value));
        }
    }

    const headers: Record<string, string> = { 'X-Identity': options.identity ?? getIdentity() };

    if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${asset(`api/${path}`)}${query.size ? `?${query}` : ''}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    if (response.status === 503) {
        throw new NotKeptError();
    }

    if (!response.ok) {
        throw new ApiError(response.status);
    }

    return (await response.json()) as T;
}

const get = <T>(path: string, params: Record<string, string | number | null | undefined> = {}) =>
    request<T>('GET', path, params);

/** The server answered with a status that is not a success */
export class ApiError extends Error {
    status: number;

    constructor(status: number) {
        super(`The server answered ${status}`);
        this.status = status;
    }
}

export const statsApi = {
    games: (tag: string | null, before: number | null = null) => get<ApiGames>('games', { tag, before, limit: 20 }),
    game: (id: number) => get<ApiGameDetail>(`games/${id}`),
    leaderboard: (by: LeaderboardBy, tag: string | null) => get<ApiLeaderboard>('leaderboard', { by, tag }),
    records: (tag: string | null) => get<ApiRecords>('records', { tag }),
    tags: () => get<ApiTags>('tags'),
    me: () => get<ApiMe>('me'),
    setPublic: (shown: boolean) => request<{ success: boolean }>('POST', 'me', {}, { body: { public: shown } }),
    /** A new code for the same player: the old one is sent in the header, the new one in the body */
    rotate: (code: string) => request<{ success: boolean }>('POST', 'me/rotate', {}, { body: { code } }),
    forget: () => request<{ success: boolean }>('DELETE', 'me')
};
