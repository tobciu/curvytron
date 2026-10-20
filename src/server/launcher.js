import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from './core/Server.js';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dev = process.argv.includes('--dev');

/**
 * Load the optional config.json (see config.json.sample)
 *
 * @return {Promise<Object>}
 */
async function loadConfig() {
    const defaults = { port: 8080, inspector: { enabled: false } };

    try {
        const config = JSON.parse(await readFile(path.join(rootDirectory, 'config.json'), 'utf8'));

        return { ...defaults, ...config };
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Invalid config.json:', error.message);
        }

        return defaults;
    }
}

/**
 * Serve the client through Vite (with hot reload) instead of the production build.
 *
 * @return {Promise<Function>} Express middleware
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
const server = new Server({
    port: Number(process.env.PORT) || config.port,
    publicDirectory: path.join(rootDirectory, 'dist'),
    middleware: dev ? await createDevMiddleware() : null
});

if (config.inspector?.enabled) {
    try {
        const { Inspector } = await import('./core/Inspector.js');
        const packageInfo = JSON.parse(await readFile(path.join(rootDirectory, 'package.json'), 'utf8'));

        new Inspector(server, config.inspector, packageInfo);
    } catch (error) {
        console.error('Inspector error:', error);
    }
}

await server.listen();

export default server;
