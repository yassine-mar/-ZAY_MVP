'use strict';

module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: ['airbnb-base'],
  parserOptions: {
    ecmaVersion: 2022,
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'consistent-return': 'off',
    'no-underscore-dangle': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['tests/**'] }],
    'no-await-in-loop': 'warn',
    'no-restricted-syntax': 'off',
  },
};
