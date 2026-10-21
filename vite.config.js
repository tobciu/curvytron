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
        // lcov for SonarQube (sonar.javascript.lcov.reportPaths); all:true also counts never-loaded files
        coverage: {
            provider: 'v8',
            all: true,
            include: ['src/**'],
            reporter: ['text', 'lcov'],
            reportsDirectory: 'coverage'
        },
        projects: [
            {
                extends: true,
                test: {
                    name: 'server',
                    environment: 'node',
                    include: ['tests/**/*.test.{js,ts}'],
                    exclude: ['tests/client/**']
                }
            },
            {
                // The browser flavor of the shared code: DOM, and the client event emitter (`{ type, detail }` events)
                extends: true,
                resolve: { alias: { '#event-emitter': path.resolve(root, 'EventEmitter.ts') } },
                test: { name: 'client', environment: 'jsdom', include: ['tests/client/**/*.test.{js,ts}'] }
            }
        ]
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
