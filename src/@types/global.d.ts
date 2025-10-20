/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />
/// <reference types="jest-axe" />

declare global {
  namespace jest {
    interface Matchers<R, T = {}> {
      toHaveNoViolations(): R;
      toBeInTheDocument(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeVisible(): R;
      toHaveTextContent(expected: string | RegExp, options?: { normalizeWhitespace?: boolean }): R;
      toHaveAttribute(attr: string, value?: string | RegExp): R;
      toHaveAccessibleName(name?: string | RegExp): R;
    }
  }
}
