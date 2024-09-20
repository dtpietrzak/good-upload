import stylistic from '@stylistic/eslint-plugin'

import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsRecommends from '@typescript-eslint/utils'

export default [{
  files: ['**/*.ts', '**/*.tsx'],
  ignores: ['node_modules/**'],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: './tsconfig.json',       // Point to your TypeScript config file
    },
  },
  plugins: {
    '@stylistic': stylistic,
    '@typescript-eslint': tsPlugin,
  },
  rules: {
    'react/no-unescaped-entities': 'off',
    semi: ['error', 'never'],
    quotes: ['warn', 'single'],
    '@stylistic/indent': ['error', 2],
    'prefer-const': 'warn',

    'object-curly-spacing': ['warn', 'always', {
      objectsInObjects: false,
      arraysInObjects: false,
    }],

    'array-bracket-spacing': ['warn', 'never'],
    'comma-dangle': ['warn', 'always-multiline'],
  },
}]