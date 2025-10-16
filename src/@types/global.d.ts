/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />
/// <reference types="jest-axe" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}
