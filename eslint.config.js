import js from '@eslint/js';
import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist/', 'node_modules/', 'test-results/', 'playwright-report/'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginVue.configs['flat/recommended'],
    {
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
        rules: {
            curly: 'error',
            eqeqeq: 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }
            ],
            // The game model is plain JavaScript, typed loosely on purpose
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            // Formatting is Prettier's job
            'vue/max-attributes-per-line': 'off',
            'vue/singleline-html-element-content-newline': 'off',
            'vue/multiline-html-element-content-newline': 'off',
            'vue/html-self-closing': 'off',
            'vue/html-indent': 'off',
            'vue/html-closing-bracket-newline': 'off',
            'vue/first-attribute-linebreak': 'off',
            'vue/html-closing-bracket-spacing': 'off',
            'vue/require-default-prop': 'off'
        }
    },
    {
        files: ['**/*.vue'],
        languageOptions: { parserOptions: { parser: tseslint.parser } }
    },
    {
        files: ['src/server/**', 'src/shared/**', '*.js', '*.ts', 'tests/**'],
        languageOptions: { globals: globals.node }
    },
    {
        files: ['src/client/**', 'src/shared/**', 'public/**', 'tests/client/**'],
        languageOptions: { globals: { ...globals.browser } }
    }
);
