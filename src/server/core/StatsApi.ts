import express, { Router, type NextFunction, type Request, type Response } from 'express';
import { leaderboardBys, type LeaderboardBy } from '../../shared/model/StatsApi.ts';
import { normalizeTag } from '../../shared/tag.ts';
import { hashIdentityCode } from './identity.ts';
import type { Accounts } from '../storage/accounts.ts';
import type { Storage } from '../storage/Storage.ts';
import type { StatsQueries } from '../storage/queries.ts';

/** Requests of one address per window: the interface is public, the database is small and synchronous */
export const apiLimit = { requests: 120, windowMs: 60_000 };

/** Most games in one answer */
const maxLimit = 100;
const defaultLimit = 20;

/** A whole number from a query string, null when there is none, `undefined` when it is not one */
function whole(value: unknown, min: number, max: number): number | null | undefined {
    if (value === undefined) {
        return null;
    }

    if (typeof value !== 'string' || !/^\d{1,15}$/.test(value)) {
        return undefined;
    }

    const number = Number(value);

    return number >= min && number <= max ? number : undefined;
}

/**
 * The HTTP interface of the statistics: reads only, JSON. It answers for everybody what the lists show; a request that
 * sends its identity code in the header `X-Identity` is told more about its own games (its own name, its own feats).
 */
export function createStatsApi(storage: Storage | null): Router {
    const router = Router();
    const windows = new Map<string, { start: number; count: number }>();

    const fail = (response: Response, status: number, error: string) => {
        response.status(status).json({ error });
    };

    // A limit per address
    router.use((request, response, next) => {
        const address = String(request.headers['x-real-ip'] ?? request.socket.remoteAddress ?? '');
        const now = Date.now();
        let window = windows.get(address);

        if (!window || now - window.start >= apiLimit.windowMs) {
            window = { start: now, count: 0 };

            if (windows.size > 1000) {
                windows.clear();
            }

            windows.set(address, window);
        }

        if (++window.count > apiLimit.requests) {
            response.setHeader('Retry-After', Math.ceil((window.start + apiLimit.windowMs - now) / 1000));

            return fail(response, 429, 'Too many requests.');
        }

        next();
    });

    // Nothing is kept: there is nothing to tell
    router.use((request, response, next) => {
        if (!storage?.queries) {
            return fail(response, 503, 'The games are not kept on this server.');
        }

        next();
    });

    const queries = (): StatsQueries => storage!.queries!;
    const accounts = (): Accounts => storage!.accounts!;

    /** The player behind the identity of the request, null when it has none or it is unknown */
    const viewer = (request: Request): number | null => {
        const hash = hashIdentityCode(request.headers['x-identity']);

        return hash ? queries().playerIdByIdentity(hash) : null;
    };

    /** What may be kept by a cache: not what depends on who asks */
    const cache = (request: Request, response: Response) => {
        response.setHeader('Cache-Control', request.headers['x-identity'] ? 'no-store' : 'public, max-age=15');
    };

    /** The tag of the request: none is all games, one that is nothing once cleaned is a mistake */
    const tagOf = (request: Request, response: Response): string | null | undefined => {
        if (request.query.tag === undefined || request.query.tag === '') {
            return null;
        }

        const tag = normalizeTag(request.query.tag);

        if (tag === null) {
            fail(response, 400, 'Not a tag.');

            return undefined;
        }

        return tag;
    };

    router.get('/games', (request, response) => {
        const limit = whole(request.query.limit, 1, maxLimit);
        const before = whole(request.query.before, 1, Number.MAX_SAFE_INTEGER);
        const tag = tagOf(request, response);

        if (tag === undefined) {
            return;
        }

        if (limit === undefined || before === undefined) {
            return fail(response, 400, 'Not a number.');
        }

        cache(request, response);
        response.json(queries().listGames({ limit: limit ?? defaultLimit, before, tag }, viewer(request)));
    });

    router.get('/games/:id', (request, response) => {
        const id = whole(request.params.id, 1, Number.MAX_SAFE_INTEGER);
        const game = id ? queries().getGame(id, viewer(request)) : null;

        if (!game) {
            return fail(response, 404, 'No such game.');
        }

        cache(request, response);
        response.json(game);
    });

    router.get('/leaderboard', (request, response) => {
        const by = (request.query.by ?? 'wins') as string;
        const tag = tagOf(request, response);

        if (tag === undefined) {
            return;
        }

        if (!(leaderboardBys as readonly string[]).includes(by)) {
            return fail(response, 400, 'Not a way to rank.');
        }

        cache(request, response);
        response.json(queries().leaderboard(by as LeaderboardBy, tag, viewer(request)));
    });

    router.get('/records', (request, response) => {
        const tag = tagOf(request, response);

        if (tag === undefined) {
            return;
        }

        cache(request, response);
        response.json(queries().records(tag));
    });

    router.get('/tags', (request, response) => {
        cache(request, response);
        response.json(queries().tags());
    });

    // What a player does with their own entry. The identity code is the proof: it is sent in a header (a page of another
    // site can not send it), and the body is JSON.
    router.use('/me', express.json({ limit: '1kb' }));

    /** The hash of the identity of the request, or an answer that it needs one */
    const identity = (request: Request, response: Response): string | null => {
        const hash = hashIdentityCode(request.headers['x-identity']);

        if (!hash) {
            fail(response, 401, 'Your identity is needed.');
        }

        return hash;
    };

    router.get('/me', (request, response) => {
        const hash = identity(request, response);

        if (hash) {
            response.setHeader('Cache-Control', 'no-store');
            response.json(accounts().me(hash));
        }
    });

    router.post('/me', (request, response) => {
        const hash = identity(request, response);

        if (!hash) {
            return;
        }

        const { public: shown } = (request.body ?? {}) as { public?: unknown };

        if (typeof shown !== 'boolean') {
            return fail(response, 400, 'Say whether to show you in the lists.');
        }

        accounts().setPublic(hash, shown);
        response.json({ success: true });
    });

    router.post('/me/rotate', (request, response) => {
        const oldHash = identity(request, response);

        if (!oldHash) {
            return;
        }

        const newHash = hashIdentityCode((request.body as { code?: unknown } | undefined)?.code);

        if (!newHash) {
            return fail(response, 400, 'Not a code.');
        }

        const result = accounts().rotate(oldHash, newHash);

        if (result === 'unknown') {
            return fail(response, 404, 'There is nothing kept for this identity.');
        }

        if (result === 'taken') {
            return fail(response, 409, 'This code belongs to somebody else.');
        }

        response.json({ success: true });
    });

    router.delete('/me', (request, response) => {
        const hash = identity(request, response);

        if (hash) {
            response.json({ success: accounts().forget(hash) });
        }
    });

    router.use((request, response) => fail(response, 404, 'Not found.'));

    // A body that is not JSON, or too large
    router.use((error: Error, request: Request, response: Response, next: NextFunction) => {
        if (response.headersSent) {
            return next(error);
        }

        fail(response, 400, 'Not understood.');
    });

    return router;
}
