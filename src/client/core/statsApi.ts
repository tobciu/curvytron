import { asset } from '../assets';
import { getIdentity } from './session';
import type {
    ApiGameDetail,
    ApiGames,
    ApiLeaderboard,
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
async function get<T>(path: string, params: Record<string, string | number | null | undefined> = {}): Promise<T> {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined && value !== '') {
            query.set(key, String(value));
        }
    }

    const response = await fetch(`${asset(`api/${path}`)}${query.size ? `?${query}` : ''}`, {
        headers: { 'X-Identity': getIdentity() }
    });

    if (response.status === 503) {
        throw new NotKeptError();
    }

    if (!response.ok) {
        throw new Error(`The server answered ${response.status}`);
    }

    return (await response.json()) as T;
}

export const statsApi = {
    games: (tag: string | null, before: number | null = null) => get<ApiGames>('games', { tag, before, limit: 20 }),
    game: (id: number) => get<ApiGameDetail>(`games/${id}`),
    leaderboard: (by: LeaderboardBy, tag: string | null) => get<ApiLeaderboard>('leaderboard', { by, tag }),
    records: (tag: string | null) => get<ApiRecords>('records', { tag }),
    tags: () => get<ApiTags>('tags')
};
