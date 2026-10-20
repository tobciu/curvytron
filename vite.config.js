import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { minify } from 'html-minifier-terser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src/client');

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
    plugins: [
        vue({
            template: {
                // <colorpicker-saturation> & co are styled custom elements
                compilerOptions: {
                    isCustomElement: (tag) => tag.startsWith('colorpicker-'),
                    // Keep whitespace between inline elements like the HTML minifier did for the old templates
                    whitespace: 'preserve'
                }
            }
        }),
        minifyIndex()
    ],
    build: {
        outDir: path.resolve(root, '../../dist'),
        emptyOutDir: true,
        sourcemap: false
    },
    test: {
        root: path.resolve(root, '../..'),
        include: ['tests/**/*.test.{js,ts}']
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
