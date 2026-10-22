/**
 * Build the totals of the players again from the games: after a change of how they are counted, or to check them.
 *
 *     npm run storage:rebuild [file]
 *
 * The file is the database of the games, `data/curvytron.db` (or `DATABASE_FILE`) when it is not given. Stop the server
 * first, or make a copy of the database and work on that.
 */
import path from 'node:path';
import { SqliteStorage } from '../src/server/storage/SqliteStorage.ts';
import { defaultStorageFile } from '../src/server/storage/index.ts';

const file = path.resolve(process.argv[2] ?? process.env.DATABASE_FILE ?? defaultStorageFile);
const storage = new SqliteStorage(file);

try {
    console.info('Totals of %d players built again from the games in %s', storage.rebuildTotals(), file);
} finally {
    storage.close();
}
