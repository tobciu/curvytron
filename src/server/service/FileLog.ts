import { createWriteStream } from 'node:fs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { format } from 'node:util';

type Level = 'log' | 'info' | 'warn' | 'error';

const levels: Level[] = ['log', 'info', 'warn', 'error'];

/**
 * Write what the server prints (info, warnings, errors) to a file too, with the time and the level
 *
 * The console keeps working as before (Docker collects it). The file is only appended to: let logrotate (with
 * `copytruncate`) or the host take care of its size.
 *
 * @param file Path of the log file, the directory is created when it is missing
 * @param target Where to write the lines of: the global console by default
 * @return A function that stops the logging and closes the file
 */
export function teeConsole(file: string, target: Pick<Console, Level> = console): () => void {
    mkdirSync(path.dirname(file), { recursive: true });

    const stream = createWriteStream(file, { flags: 'a' });
    const originals = Object.fromEntries(levels.map((level) => [level, target[level]])) as Record<
        Level,
        (...args: unknown[]) => void
    >;

    for (const level of levels) {
        target[level] = (...args: unknown[]) => {
            originals[level].apply(target, args);
            stream.write(`${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${format(...args)}\n`);
        };
    }

    return () => {
        for (const level of levels) {
            target[level] = originals[level];
        }

        stream.end();
    };
}
