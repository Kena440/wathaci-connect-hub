/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
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
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        module: 'esnext',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
        },
        typeRoots: ['node_modules/@types', 'src/@types'],
        types: ['jest', 'jest-axe', '@testing-library/jest-dom', 'node'],
      }
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|uuid)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
