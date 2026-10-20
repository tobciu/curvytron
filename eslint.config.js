import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['dist/', 'node_modules/'] },
    js.configs.recommended,
    {
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
        rules: {
            curly: 'error',
            eqeqeq: 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }]
        }
    },
    {
        files: ['src/server/**', 'src/shared/**', '*.js', 'tests/**'],
        languageOptions: { globals: globals.node }
    },
    {
        files: ['src/client/**', 'src/shared/**', 'public/**'],
        languageOptions: { globals: { ...globals.browser, angular: 'readonly', createjs: 'readonly' } }
    }
];
