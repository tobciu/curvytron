import Server from './core/Server.js';
import Inspector from './core/Inspector.js';
import fs from 'fs';

let config;

try {
const configData = fs.readFileSync('config.json', 'utf8');
    config = JSON.parse(configData);
} catch (error) {
    config = {
        port: 8080,
        inspector: { enabled: false }
    };
}

const server = new Server({ port: config.port });

if (config.inspector.enabled) {
    try {
        new Inspector(server, config.inspector);
    } catch (error) {
        console.error('Inspector error:', error);
    }
}

export default server;
