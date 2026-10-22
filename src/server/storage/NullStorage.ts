import type { Storage, StorageStatus } from './Storage.ts';

/** Keeps nothing: the storage is disabled, or it could not be opened */
export class NullStorage implements Storage {
    readonly queries = null;
    readonly accounts = null;
    error: string | null;

    constructor(error: string | null = null) {
        this.error = error;
    }

    saveGame(): void {}

    status(): StorageStatus {
        return this.error ? { state: 'error', error: this.error } : { state: 'off' };
    }

    close(): void {}
}
