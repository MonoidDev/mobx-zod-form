module.exports = {
  ignorePatterns: ['**/vendors/**'],
  plugins: ['import', '@typescript-eslint', 'prettier'],
  parser: '@typescript-eslint/parser',
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal'],
        pathGroups: [
          {
            pattern: '@(react|react-native)',
            group: 'external',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['react'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'prettier/prettier': 'error',
    'no-restricted-imports': [
      'error',
      '@material-ui/core',
      '@material-ui/icons',
      'lodash', // Use lodash-es instead
    ],
    // Importing the entire library leads to slow typescript typechecking!
    // Good: import Menu from '@material-ui/core/Menu';
    // Bad: import { Menu } from '@material-ui/core';
    // @see: https://v4.mui.com/zh/guides/minimizing-bundle-size/
  },
  parserOptions: {
    project: ['./tsconfig.json'],
  },
};
