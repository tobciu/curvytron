import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { minify } from 'html-minifier-terser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src/client');

/**
 * Angular templates (`import template from './views/x.html?template'`) are whitespace-collapsed
 * like the previous gulp build did: the layout of the game depends on it.
 */
function templates() {
    return {
        name: 'curvytron-templates',
        async load(id) {
            if (!id.endsWith('.html?template')) {
                return null;
            }

            const file = id.slice(0, -'?template'.length);

            this.addWatchFile(file);

            const html = await minify(await readFile(file, 'utf8'), { collapseWhitespace: true });

            return `export default ${JSON.stringify(html)};`;
        }
    };
}

/**
 * Collapse whitespace of the index page in production.
 */
function minifyIndex() {
    return {
        name: 'curvytron-index',
        apply: 'build',
        transformIndexHtml: {
            order: 'post',
            handler: (html) => minify(html, { collapseWhitespace: true })
        }
    };
}

export default defineConfig({
    root,
    base: './',
    publicDir: path.resolve(root, '../../public'),
    plugins: [templates(), minifyIndex()],
    build: {
        outDir: path.resolve(root, '../../dist'),
        emptyOutDir: true,
        sourcemap: true
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
                quietDeps: true,
                silenceDeprecations: ['import', 'global-builtin', 'slash-div', 'mixed-decls', 'color-functions']
            }
        }
    }
});
