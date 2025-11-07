import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { SignUp } from '../SignUp';

jest.mock('@/contexts/AppContext', () => ({
  useAppContext: () => ({
    signUp: jest.fn().mockResolvedValue({}),
  }),
}));

jest.mock('@/lib/api/register-user', () => ({
  registerUser: jest.fn().mockResolvedValue({ user: {} }),
}));

const SignUpWrapper = () => (
  <BrowserRouter>
    <SignUp />
  </BrowserRouter>
);

describe('SignUp Validation', () => {
  it('shows validation error for invalid email format', async () => {
    render(<SignUpWrapper />);

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('shows validation error for weak password', async () => {
    render(<SignUpWrapper />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    });
  });

  it('shows validation error when passwords do not match', async () => {
    render(<SignUpWrapper />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    fireEvent.change(passwordInput, { target: { value: 'Password1' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password2' } });
    fireEvent.blur(confirmPasswordInput);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('requires accepting terms and disables submission until the form is valid', async () => {
    render(<SignUpWrapper />);

    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'John' },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Doe' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'Password1' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'Password1' },
    });

    fireEvent.click(screen.getByLabelText(/Professional/i));

    expect(submitButton).toBeDisabled();

    const termsCheckbox = screen.getByRole('checkbox', { name: /terms of service/i });
    fireEvent.click(termsCheckbox);

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(termsCheckbox);

    await waitFor(() => {
      expect(screen.getByText('You must agree to the terms and conditions')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });
});
