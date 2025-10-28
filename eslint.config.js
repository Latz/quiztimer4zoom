import js from '@eslint/js';
import security from 'eslint-plugin-security';

export default [
  {
    ignores: ['node_modules/', 'dist/', '.vite/', '.vercel/']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly'
      }
    },
    plugins: {
      security
    },
    rules: {
      ...js.configs.recommended.rules,
      ...security.configs.recommended.rules,
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-child-process': 'warn',
      'security/detect-no-csrf-before-method-override': 'warn',
      'security/detect-unsafe-regex': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error'
    }
  }
];
