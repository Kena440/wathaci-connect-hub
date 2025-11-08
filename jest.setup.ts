import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

// Extend Jest with jest-axe matchers
expect.extend(toHaveNoViolations);

// Add fetch polyfill for tests that use fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({ received: true }),
    text: async () => '',
  } as Response)
);
