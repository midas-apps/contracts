import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base recommended rules
  js.configs.recommended,

  // TypeScript recommended configs
  ...tseslint.configs.recommended,

  // Global settings
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.mocha,
      },
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
    },
    plugins: {
      import: importPlugin,
      prettier: prettier,
      'unused-imports': unusedImports,
    },
    rules: {
      // Disable TypeScript's no-unused-vars in favor of unused-imports
      '@typescript-eslint/no-unused-vars': 'off',

      // Enable prefer-const (auto-fixable by default in ESLint)
      // Note: Cannot auto-fix destructuring assignments where some vars need const and others need let
      // Example: let { a, b } = ... where a should be const but b is reassigned later
      'prefer-const': 'warn',

      // Disable no-unused-expressions (prefer explicit assertions)
      '@typescript-eslint/no-unused-expressions': 'off',

      // Unused imports rules
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // Import order rules
      'import/order': [
        'error',
        {
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          groups: [
            'external',
            'builtin',
            'index',
            'sibling',
            'parent',
            'internal',
            'object',
          ],
          'newlines-between': 'always',
        },
      ],

      // Prettier integration
      'prettier/prettier': 'error',
    },
  },

  // Prettier config (disables conflicting rules)
  prettierConfig,

  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'artifacts/**',
      'cache/**',
      'coverage/**',
      'typechain-types/**',
      'docgen/**',
      'deployments/**',
    ],
  },
);
