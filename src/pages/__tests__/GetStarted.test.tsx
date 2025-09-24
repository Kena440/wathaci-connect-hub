import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { GetStarted } from '../GetStarted';

// Mock the AppContext
jest.mock('@/contexts/AppContext', () => ({
  useAppContext: () => ({
    signUp: jest.fn().mockResolvedValue({}),
  }),
}));

const GetStartedWrapper = () => (
  <BrowserRouter>
    <GetStarted />
  </BrowserRouter>
);

beforeAll(() => {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-ignore
  global.ResizeObserver = ResizeObserver;
});

describe('GetStarted Validation', () => {
  it('shows validation error for invalid email format', async () => {
    render(<GetStartedWrapper />);

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  it('shows validation error for weak password', async () => {
    render(<GetStartedWrapper />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    fireEvent.change(passwordInput, { target: { value: '123' } });

    await waitFor(() => {
      expect(
        screen.getByText('Password must be at least 8 characters long')
      ).toBeTruthy();
    });
  });

  it('shows validation error when passwords do not match', async () => {
    render(<GetStartedWrapper />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    fireEvent.change(passwordInput, { target: { value: 'Password1' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password2' } });

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeTruthy();
    });
  });

  it('requires accepting terms and disables submission until the form is valid', async () => {
    render(<GetStartedWrapper />);

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

    fireEvent.click(screen.getByText('Select account type'));
    fireEvent.click(screen.getByRole('option', { name: 'Professional' }));

    // Terms not accepted yet, button should remain disabled
    expect(submitButton).toBeDisabled();

    // Accept terms
    fireEvent.click(screen.getByRole('checkbox'));

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    // Uncheck to trigger validation error
    fireEvent.click(screen.getByRole('checkbox'));

    await waitFor(() => {
      expect(
        screen.getByText('You must agree to the terms and conditions')
      ).toBeTruthy();
      expect(submitButton).toBeDisabled();
    });
  });

  it('allows optional middle name to be entered', async () => {
    render(<GetStartedWrapper />);

    const middleNameInput = screen.getByLabelText(/middle name/i);
    expect(middleNameInput).toBeInTheDocument();
    
    fireEvent.change(middleNameInput, { target: { value: 'Michael' } });
    expect(middleNameInput).toHaveValue('Michael');
    
    // Middle name should be optional - form should be submittable without it
    fireEvent.change(middleNameInput, { target: { value: '' } });
    expect(middleNameInput).toHaveValue('');
  });
});

