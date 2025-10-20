import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

// Extend Jest with jest-axe matchers
expect.extend(toHaveNoViolations);
