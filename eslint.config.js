import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'dist-server/',
      'node_modules/',
      'web/',
      'doc/reference-build/',
      // Svelte client — type-checked by svelte-check (no eslint-plugin-svelte yet).
      'src/client/',
      // Deferred legacy CommonJS (server trackers — not yet ported to ESM/TS).
      'src/**/*.js',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // Node context: server code, build scripts, config files.
    files: ['src/server/**/*.ts', 'scripts/**/*.{js,mjs}', '*.config.{js,ts,mjs}', 'svelte.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Browser context: the client engine.
    files: ['src/client/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },

  {
    // Rules carried over from the legacy .jshintrc.
    rules: {
      quotes: ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      eqeqeq: ['warn', 'always'],
      curly: ['warn', 'all'],
      camelcase: ['warn', { properties: 'never' }],
      'no-var': 'warn',
      '@typescript-eslint/no-this-alias': 'off',
      'prefer-const': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
