import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'dist-server/',
      'node_modules/',
      'web/',
      'doc/reference-build/',
      // Svelte files — no eslint-plugin-svelte yet; type-checked by svelte-check.
      'src/client/**/*.svelte',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // Type-aware linting (needed for rules like no-unnecessary-type-assertion).
    // projectService auto-discovers the nearest tsconfig.json per file.
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.{js,ts,mjs}', 'svelte.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

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
    plugins: { unicorn },
    // Rules carried over from the legacy .jshintrc.
    rules: {
      quotes: ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      eqeqeq: ['warn', 'always', { null: 'ignore' }], // `x == null` / `x != null` (null-or-undefined) stays
      curly: ['warn', 'all'],
      camelcase: ['warn', { properties: 'never' }],
      'no-var': 'warn',
      '@typescript-eslint/no-this-alias': 'off',
      'prefer-const': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // SonarQube parity — these mirror rules SonarQube's analyzer also flags.
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      'no-unneeded-ternary': 'warn',
      'unicorn/prefer-global-this': 'warn',
      'unicorn/no-negated-condition': 'warn',
      'unicorn/prefer-date-now': 'warn',
      'unicorn/prefer-number-properties': 'warn',
      'unicorn/no-typeof-undefined': 'warn',
    },
  },
);
