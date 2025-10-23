import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SignIn from '../SignIn';

// Mock the AppContext
jest.mock('@/contexts/AppContext', () => ({
  useAppContext: () => ({
    initiateSignIn: jest.fn().mockResolvedValue({ otpSent: true, offlineState: null }),
    verifyOtp: jest.fn().mockResolvedValue({ user: null, profile: null }),
    resendOtp: jest.fn(),
  }),
}));

const SignInWrapper = () => (
  <BrowserRouter>
    <SignIn />
  </BrowserRouter>
);

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
    fireEvent.blur(emailInput); // Trigger blur event to show validation
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  it('shows validation error for short password', async () => {
    render(<SignInWrapper />);
    
    const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters long')).toBeTruthy();
    });
  });

  it('does not show validation errors for valid inputs', async () => {
    render(<SignInWrapper />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Should not show validation errors
    await waitFor(() => {
      expect(screen.queryByText('Email is required')).toBeNull();
      expect(screen.queryByText('Please enter a valid email address')).toBeNull();
      expect(screen.queryByText('Password is required')).toBeNull();
      expect(screen.queryByText('Password must be at least 6 characters long')).toBeNull();
    });
  });
});