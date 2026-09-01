// Assembles web-ref/ from the Phase-0 reference build + the committed media, so a
// modernized Node 24 server can serve the legacy client while the Svelte rewrite is
// in progress. web-ref/ is git-ignored.
import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = 'web-ref';
const REF = 'doc/reference-build';

if (!existsSync(REF)) {
  console.error(`[prepare-reference-web] ${REF} missing — cannot assemble ${OUT}.`);
  process.exit(1);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(`${OUT}/css`, { recursive: true });

await cp(`${REF}/index.html`, `${OUT}/index.html`);
await cp(`${REF}/js`, `${OUT}/js`, { recursive: true });
await cp(`${REF}/style.css`, `${OUT}/css/style.css`);

for (const dir of ['images', 'sounds', 'font']) {
  if (existsSync(`web/${dir}`)) {
    await cp(`web/${dir}`, `${OUT}/${dir}`, { recursive: true });
  }
}

console.log(`[prepare-reference-web] wrote ${OUT}/ (legacy client for Node 24)`);
