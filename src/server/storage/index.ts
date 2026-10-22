import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { NullStorage } from './NullStorage.ts';
import type { Storage } from './Storage.ts';

export type { Storage, StorageStatus } from './Storage.ts';
export { NullStorage } from './NullStorage.ts';

/** `config.json`: `{ "storage": { "enabled": true, "file": "data/curvytron.db" } }` */
export interface StorageConfig {
    enabled?: boolean;
    /** Relative to the application, `:memory:` for none that stays */
    file?: string;
}

export const defaultStorageFile = 'data/curvytron.db';

/**
 * Open the storage of the configuration. The game does not depend on it: when the database can not be opened (rights, a
 * disk that is full, a database of a newer version), the server says so and goes on without keeping the games.
 */
export async function createStorage(
    config: StorageConfig | undefined,
    root: string,
    version: string,
    file: string | undefined = process.env.DATABASE_FILE
): Promise<Storage> {
    if (config?.enabled === false) {
        return new NullStorage();
    }

    const target = file ?? config?.file ?? defaultStorageFile;

    try {
        // Loaded here so that a Node without SQLite only fails when it is needed
        const { SqliteStorage } = await import('./SqliteStorage.ts');
        const location = target === ':memory:' ? target : path.resolve(root, target);

        if (location !== ':memory:') {
            mkdirSync(path.dirname(location), { recursive: true });
        }

        return new SqliteStorage(location, version);
    } catch (error) {
        const message = (error as Error).message;

        console.error('Can not open the database "%s", the games are not kept: %s', target, message);

        return new NullStorage(message);
    }
}
