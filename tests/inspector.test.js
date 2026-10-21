import { describe, expect, it, vi } from 'vitest';

const writePoints = vi.fn(() => Promise.resolve());

vi.mock('influx', () => ({
    InfluxDB: class {
        writePoints = writePoints;
    }
}));

describe('inspector', () => {
    it('loads, and writes the deployment to InfluxDB', async () => {
        // Imported the way the launcher does it
        const { Inspector } = await import('../src/server/core/Inspector.ts');
        const { Server } = await import('../src/server/core/Server.ts');
        const server = new Server({ port: 0, publicDirectory: 'dist' });
        const inspector = new Inspector(server, { host: 'localhost', database: 'test' }, { version: '1.2.3' });

        expect(inspector).toBeDefined();
        server.close();
        expect(writePoints).toHaveBeenCalledWith([
            expect.objectContaining({ measurement: 'deploy', fields: { version: '1.2.3' } })
        ]);
    });
});
