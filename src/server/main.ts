import { readFileSync, existsSync } from 'node:fs';
import { Server, type ServerConfig } from './core/Server.ts';

interface FileConfig {
  port?: number;
  googleAnalyticsId?: string | null;
  inspector?: { enabled?: boolean };
}

function loadConfig(): ServerConfig {
  let file: FileConfig = {};
  for (const path of ['config.json', 'config.js', 'curvytron_data/config.js']) {
    if (existsSync(path)) {
      try {
        file = JSON.parse(readFileSync(path, 'utf8')) as FileConfig;
        break;
      } catch (error) {
        console.error(`Could not parse ${path}:`, error);
      }
    }
  }

  const port = Number(process.env.PORT ?? file.port ?? 8080);
  const staticDir =
    process.env.STATIC_DIR ?? (existsSync('web/index.html') ? 'web' : 'web-ref');

  if (file.inspector?.enabled || process.env.INSPECTOR_ENABLED === 'true') {
    console.warn('Inspector requested but not yet ported to the modern build — skipping.');
  }

  return { port, staticDir };
}

const config = loadConfig();
console.info('Serving static files from "%s"', config.staticDir);

export const server = new Server(config);
