import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SignIn from '../SignIn';

const mockSignIn = jest.fn().mockResolvedValue({ user: null, profile: null });

jest.mock('@/contexts/AppContext', () => ({
  useAppContext: () => ({
    signIn: mockSignIn,
    signUp: jest.fn(),
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    user: null,
    profile: null,
    loading: false,
    sidebarOpen: false,
    toggleSidebar: jest.fn(),
  }),
}));

const SignInWrapper = () => (
  <BrowserRouter>
    <SignIn />
  </BrowserRouter>
);

beforeEach(() => {
  mockSignIn.mockClear();
});

describe('SignIn Validation', () => {
  it('shows validation errors for empty form submission', async () => {
    render(<SignInWrapper />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeTruthy();
      expect(screen.getByText('Password is required')).toBeTruthy();
    });
  });

  it('shows validation error for invalid email format', async () => {
    render(<SignInWrapper />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address')).toBeTruthy();
    });
  });

  it('shows validation error for short password', async () => {
    render(<SignInWrapper />);

    const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeTruthy();
    });
  });

  it('submits valid credentials', async () => {
    render(<SignInWrapper />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('Email is required')).toBeNull();
      expect(screen.queryByText('Enter a valid email address')).toBeNull();
      expect(screen.queryByText('Password is required')).toBeNull();
      expect(screen.queryByText('Password must be at least 8 characters long')).toBeNull();
    });

    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
  });
});
