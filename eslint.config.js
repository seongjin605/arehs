// ESLint v9 새로운 설정 형식
import js from '@eslint/js';
import * as parser from '@typescript-eslint/parser';
import * as eslintPlugin from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier/recommended';
import jestPlugin from 'eslint-plugin-jest';
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'url';
import path from 'path';

// ESLint v8 방식 설정 사용을 위한 호환성 객체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

// v8 설정을 사용 (tsconfig 포함)
export default [
  js.configs.recommended,
  ...compat.config({
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended',
      'plugin:jest/recommended'
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'jest'],
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-floating-promises': 'off'
    }
  }),
  {
    files: ['**/*.ts'],
    ignores: ['dist/**', 'node_modules/**']
  }
];
