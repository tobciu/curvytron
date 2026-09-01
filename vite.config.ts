/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: 'src/client',
  // Static media the legacy client expects at the web root (images/, sounds/, font/).
  publicDir: r('./web'),
  plugins: [svelte()],
  resolve: {
    alias: {
      '@shared': r('./src/shared'),
      '@client': r('./src/client'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // WebSocket + anything not served by Vite goes to the game server.
      '/socket': { target: 'ws://localhost:8080', ws: true },
    },
  },
  build: {
    outDir: r('./dist'),
    emptyOutDir: true,
  },
  test: {
    // src/shared + src/server unit tests (Node); Svelte component tests come later.
    root: r('.'),
    include: ['src/{shared,server}/**/*.{test,spec}.ts'],
    environment: 'node',
  },
});
