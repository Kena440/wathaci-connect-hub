import '@testing-library/jest-dom';
// @ts-ignore - upstream package is missing type definitions for the matchers submodule with Jest 30
import matchers from '@testing-library/jest-dom/matchers';
import { toHaveNoViolations } from 'jest-axe';

// Extend Jest with jest-axe matchers
expect.extend(matchers);
expect.extend(toHaveNoViolations);
