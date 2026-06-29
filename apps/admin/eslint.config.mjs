import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'next-env.d.ts',
      'tsconfig.tsbuildinfo',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default eslintConfig;
