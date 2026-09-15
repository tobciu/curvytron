import { readFileSync, existsSync } from 'node:fs';
import { Server, type ServerConfig } from './core/Server.ts';
import { Inspector, type InspectorConfig } from './core/Inspector.ts';

interface FileInspectorConfig {
  enabled?: boolean;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
}

interface FileConfig {
  port?: number;
  inspector?: FileInspectorConfig;
}

function loadInspectorConfig(file?: FileInspectorConfig): InspectorConfig | null {
  const enabled = process.env.INSPECTOR_ENABLED === 'true' || file?.enabled === true;
  if (!enabled) {
    return null;
  }

  return {
    host: process.env.INSPECTOR_HOST ?? file?.host ?? '127.0.0.1',
    port: Number(process.env.INSPECTOR_PORT ?? file?.port ?? 8086),
    username: process.env.INSPECTOR_USERNAME ?? file?.username ?? 'root',
    password: process.env.INSPECTOR_PASSWORD ?? file?.password ?? 'root',
    database: process.env.INSPECTOR_DATABASE ?? file?.database ?? 'curvytron',
  };
}

function loadConfig(): { server: ServerConfig; inspector: InspectorConfig | null } {
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
  // The Vite client build (index.html + assets + copied web/ media) lands in dist/.
  const staticDir =
    process.env.STATIC_DIR ?? (existsSync('dist/index.html') ? 'dist' : 'web');

  return {
    server: { port, staticDir },
    inspector: loadInspectorConfig(file.inspector),
  };
}

const config = loadConfig();
console.info('Serving static files from "%s"', config.server.staticDir);

export const server = new Server(config.server);

export const inspector = config.inspector ? new Inspector(server, config.inspector) : null;
