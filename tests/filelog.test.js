import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { teeConsole } from '../src/server/service/FileLog.ts';

let directory;

afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
});

describe('log file', () => {
    it('gets what is printed, with time and level, and the console is still used', async () => {
        directory = mkdtempSync(join(tmpdir(), 'curvytron-'));

        const file = join(directory, 'logs', 'curvytron.log');
        const target = { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        const original = target.error;
        const stop = teeConsole(file, target);

        target.info('Client %s connected.', 12);
        target.error('Failed:', new Error('boom').message);
        stop();
        target.error('not in the file');

        await new Promise((resolve) => setTimeout(resolve, 50));

        const lines = readFileSync(file, 'utf8').trim().split('\n');

        expect(lines).toHaveLength(2);
        expect(lines[0]).toMatch(/^\d{4}-\d\d-\d\dT[\d:.]+Z INFO {2}Client 12 connected\.$/);
        expect(lines[1]).toMatch(/ ERROR Failed: boom$/);
        expect(original).toHaveBeenCalledWith('Failed:', 'boom');
        expect(original).toHaveBeenCalledWith('not in the file');
    });
});
