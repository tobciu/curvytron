import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** The `any` types of the code: there are fewer and fewer, never more. Lower the limit when you remove some. */
const maxExplicitAny = 577;

function files(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);

        return entry.isDirectory() ? files(path) : [path];
    });
}

describe('code quality', () => {
    it('does not use more explicit `any` than it did', () => {
        const sources = files('src').filter((path) => /\.(ts|vue)$/.test(path));
        const count = sources.reduce((total, path) => {
            return total + (readFileSync(path, 'utf8').match(/(?<=[:<(,|] ?)any\b|\bas any\b/g) ?? []).length;
        }, 0);

        console.info(`${count} explicit any (limit ${maxExplicitAny})`);
        expect(count).toBeLessThanOrEqual(maxExplicitAny);
    });

    it('has no JavaScript left in src', () => {
        expect(files('src').filter((path) => path.endsWith('.js'))).toEqual([]);
    });
});
