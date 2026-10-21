import { spawn } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/**
 * The other server tests run through Vite, which resolves imports more kindly than Node does. This one starts the
 * server as it is started in production, so that a wrong import path or a syntax that Node can not strip fails here.
 */
describe('launcher', () => {
    it('starts under Node and serves the metrics', async () => {
        const child = spawn(process.execPath, ['src/server/launcher.ts'], {
            env: { ...process.env, PORT: '0' },
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let output = '';

        child.stdout.on('data', (chunk) => (output += chunk));
        child.stderr.on('data', (chunk) => (output += chunk));

        try {
            const port = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error(`No start after 10 s:\n${output}`)), 10_000);
                const check = () => {
                    const match = output.match(/Listening on port (\d+)/);

                    if (match) {
                        clearTimeout(timer);
                        resolve(Number(match[1]));
                    }
                };

                child.stdout.on('data', check);
                child.once('exit', (code) => reject(new Error(`Exited with ${code}:\n${output}`)));
            });

            const response = await fetch(`http://localhost:${port}/metrics`);

            expect(response.status).toBe(200);
            expect(await response.text()).toContain('curvytron_clients 0');
        } finally {
            child.kill();
        }
    });
});
