import type { DatabaseSync } from 'node:sqlite';
import { anonymous, type ApiMe, type ApiMyFeat, type ApiMyTotals } from '../../shared/model/StatsApi.ts';
import { totalsFromRow } from './totals.ts';

/**
 * What a player does with their own entry: whether they show in the public lists, a new identity code, forgetting. A
 * player is the identity code of a browser, here as its hash: nothing else tells who asks.
 */
export class Accounts {
    db: DatabaseSync;

    constructor(db: DatabaseSync) {
        this.db = db;
    }

    private idOf(hash: string): number | null {
        const row = this.db.prepare('SELECT id FROM players WHERE identity_hash = ?').get(hash) as
            { id: number } | undefined;

        return row?.id ?? null;
    }

    /** What the player knows about themselves: their totals and their feats, with the real names of the feats */
    me(hash: string): ApiMe {
        const player = this.db.prepare('SELECT id, name, public FROM players WHERE identity_hash = ?').get(hash) as
            { id: number; name: string; public: number } | undefined;

        if (!player) {
            return { known: false };
        }

        const row = this.db.prepare('SELECT * FROM player_totals WHERE player_id = ?').get(player.id) as
            Parameters<typeof totalsFromRow>[0] | undefined;
        const totals = totalsFromRow(
            row ?? { games: 0, wins: 0, rounds_won: 0, kills: 0, deaths: 0, totals_json: '{}' }
        );
        const mine: ApiMyTotals = {
            games: totals.games,
            wins: totals.wins,
            winRate: totals.games > 0 ? totals.wins / totals.games : 0,
            roundsWon: totals.roundsWon,
            kills: totals.kills,
            deaths: totals.deaths,
            bestLife: totals.best.longestLife ?? 0,
            bestStreak: totals.best.longestStreak ?? 0,
            bonuses: totals.sums.bonuses ?? 0
        };
        const feats = this.db
            .prepare(
                `SELECT f.feat AS id, f.round, f.game_id AS gameId, g.ended_at AS endedAt, g.room,
                        op.name AS other_name, opp.public AS other_public
                 FROM feats f
                 JOIN game_players gp ON gp.game_id = f.game_id AND gp.slot = f.slot
                 JOIN games g ON g.id = f.game_id
                 LEFT JOIN game_players op ON op.game_id = f.game_id AND op.slot = f.other_slot
                 LEFT JOIN players opp ON opp.id = op.player_id
                 WHERE gp.player_id = ? ORDER BY g.ended_at DESC, f.round DESC, f.rowid DESC`
            )
            .all(player.id) as Array<
            Omit<ApiMyFeat, 'other'> & { other_name: string | null; other_public: number | null }
        >;

        return {
            known: true,
            name: player.name,
            public: player.public === 1,
            totals: mine,
            feats: feats.map(({ other_name: other, other_public: otherPublic, ...feat }) => ({
                ...feat,
                ...(other === null ? {} : { other: otherPublic === 0 ? anonymous : other })
            }))
        };
    }

    /** Show in the public lists or not. Works before the first game: the entry is made, the game gives it the name. */
    setPublic(hash: string, shown: boolean): void {
        const now = Date.now();

        this.db
            .prepare(
                `INSERT INTO players (identity_hash, name, public, created_at, last_seen) VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(identity_hash) DO UPDATE SET public = excluded.public`
            )
            .run(hash, anonymous, shown ? 1 : 0, now, now);
    }

    /**
     * A new code for the same player, with their history. The old one is worth nothing afterwards.
     * `unknown`: the old code has no history, `taken`: the new code belongs to somebody else.
     */
    rotate(oldHash: string, newHash: string): 'ok' | 'unknown' | 'taken' {
        if (this.idOf(oldHash) === null) {
            return 'unknown';
        }

        if (oldHash === newHash) {
            return 'ok';
        }

        if (this.idOf(newHash) !== null) {
            return 'taken';
        }

        this.db.prepare('UPDATE players SET identity_hash = ? WHERE identity_hash = ?').run(newHash, oldHash);

        return 'ok';
    }

    /**
     * Forget the player: their entry and totals go, their games stay with the name "Anonymous" and no owner
     */
    forget(hash: string): boolean {
        const id = this.idOf(hash);

        if (id === null) {
            return false;
        }

        this.db.exec('BEGIN IMMEDIATE');

        try {
            this.db.prepare('UPDATE game_players SET name = ? WHERE player_id = ?').run(anonymous, id);
            this.db.prepare('DELETE FROM players WHERE id = ?').run(id);
            this.db.exec('COMMIT');
        } catch (error) {
            this.db.exec('ROLLBACK');

            throw error;
        }

        return true;
    }
}
