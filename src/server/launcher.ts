import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from './core/Server.ts';
import { teeConsole } from './service/FileLog.ts';
import { createStorage } from './storage/index.ts';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dev = process.argv.includes('--dev');

/**
 * Load the optional config.json (see config.json.sample)
 */
async function loadConfig() {
    const defaults = { port: 8080, inspector: { enabled: false }, storage: { enabled: true } };

    try {
        const config = JSON.parse(await readFile(path.join(rootDirectory, 'config.json'), 'utf8'));

        return { ...defaults, ...config };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error('Invalid config.json:', (error as Error).message);
        }

        return defaults;
    }
}

/**
 * Serve the client through Vite (with hot reload) instead of the production build.
 *
 * @return Express middleware
 */
async function createDevMiddleware() {
    const { createServer } = await import('vite');
    const vite = await createServer({
        configFile: path.join(rootDirectory, 'vite.config.js'),
        appType: 'spa',
        server: { middlewareMode: true, hmr: { port: 24678 } }
    });

    return vite.middlewares;
}

const config = await loadConfig();
const packageInfo = JSON.parse(await readFile(path.join(rootDirectory, 'package.json'), 'utf8'));

if (config.log?.file) {
    try {
        teeConsole(path.resolve(rootDirectory, config.log.file));
    } catch (error) {
        console.error('Can not write the log file:', (error as Error).message);
    }
}

// A bug that nobody handled: say it, and stop. Docker (restart: unless-stopped) starts the server again.
for (const event of ['uncaughtException', 'unhandledRejection'] as const) {
    process.on(event, (error) => {
        console.error(`Fatal (${event}):`, error);
        process.exit(1);
    });
}

const storage = await createStorage(config.storage, rootDirectory, packageInfo.version);

const server = new Server({
    port: process.env.PORT ? Number(process.env.PORT) : config.port,
    metrics: config.metrics,
    storage,
    version: packageInfo.version,
    publicDirectory: path.join(rootDirectory, 'dist'),
    middleware: dev ? await createDevMiddleware() : null
});

if (config.inspector?.enabled) {
    try {
        const { Inspector } = await import('./core/Inspector.ts');
        new Inspector(server, config.inspector, packageInfo);
    } catch (error) {
        console.error('Inspector error:', error);
    }
}

await server.listen();

export default server;
