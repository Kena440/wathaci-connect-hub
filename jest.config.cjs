/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
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
    '<rootDir>/src/test/basic.test.js', // Node.js test runner test
    '<rootDir>/src/components/__tests__/LencoPayment.manual-verification.ts', // Manual verification guide, not a test
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(isows|@supabase|ws)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/main.tsx',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: './tsconfig.app.json',
      useESM: true
    }],
    '^.+\\.jsx?$': ['babel-jest', { configFile: './babel.config.cjs' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
