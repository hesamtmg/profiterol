// One ESLint setup for every workspace: TypeScript everywhere, Vue in the web app, Node globals for scripts.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.nuxt/**', '**/.output/**', 'apps/api/src/migrations/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] } },
  },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      // Blocks render admin-written rich text that the API has already cleaned (apps/api/src/common/rich-text.ts).
      'vue/no-v-html': 'off',
      // Nuxt pages and layouts are named by their file.
      'vue/multi-word-component-names': 'off',
      // Block props are validated by the shared registry, not by Vue prop defaults.
      'vue/require-default-prop': 'off',
    },
  },
  {
    // Nuxt auto-imports (ref, computed, useApi, …) are globals to ESLint; TypeScript checks them instead.
    files: ['apps/web/**/*.{ts,vue}'],
    rules: { 'no-undef': 'off' },
  },
  prettier,
);
