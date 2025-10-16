import '@testing-library/jest-dom';
import matchers from '@testing-library/jest-dom/matchers';
import { expect } from '@jest/globals';
import { toHaveNoViolations } from 'jest-axe';

// Extend Jest with jest-dom and jest-axe matchers
expect.extend(matchers);
expect.extend(toHaveNoViolations);
