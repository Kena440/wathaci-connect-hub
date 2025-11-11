const { defaultsESM: tsJestPresets } = require('ts-jest/presets');

/** @type {import('jest').Config} */
module.exports = {
  ...tsJestPresets,
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/test/',
    '<rootDir>/src/test/basic.test.js',
    '\\.manual-verification\\.ts$',
  ],
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/main.tsx',
  ],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: '<rootDir>/tsconfig.app.json',
    },
  },
  transform: {
    ...tsJestPresets.transform,
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.app.json',
      useESM: true,
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: '<rootDir>/babel.config.cjs' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|uuid)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
