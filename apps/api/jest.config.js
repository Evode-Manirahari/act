module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@actober/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
    '^@actober/act-prompts$': '<rootDir>/../../packages/act-prompts/src/index.ts',
  },
};
