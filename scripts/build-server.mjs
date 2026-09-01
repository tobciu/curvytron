// Bundles the server (src/server/main.ts + src/shared) into dist-server/main.js.
// Phase 1 tooling; the entry (src/server/main.ts) lands with the ESM/TS conversion.
import { build, context } from 'esbuild';
import { existsSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const entry = 'src/server/main.ts';

if (!existsSync(entry)) {
  console.log(
    `[build-server] ${entry} does not exist yet — it lands with the src/server ` +
      `ESM/TS conversion (Phase 1). Nothing to build.`,
  );
  process.exit(0);
}

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: [entry],
  outfile: 'dist-server/main.js',
  platform: 'node',
  target: 'node24',
  format: 'esm',
  bundle: true,
  sourcemap: true,
  // Keep real deps external; they are installed from package.json.
  packages: 'external',
  logLevel: 'info',
  banner: {
    js: `import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);`,
  },
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('[build-server] watching…');
} else {
  await build(options);
}
