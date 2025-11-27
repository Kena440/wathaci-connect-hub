import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPassword from '../ForgotPassword';

jest.mock('@/lib/services', () => {
  const mockRequestPasswordReset = jest.fn();

  return {
    __esModule: true,
    userService: {
      requestPasswordReset: mockRequestPasswordReset,
    },
  };
});

jest.mock('@/hooks/use-toast', () => {
  const mockToast = jest.fn();

  return {
    __esModule: true,
    useToast: () => ({ toast: mockToast }),
    mockToast,
  };
});

const mockRequestPasswordReset =
  (jest.requireMock('@/lib/services') as { userService: { requestPasswordReset: jest.Mock } }).userService
    .requestPasswordReset;
const mockToast = (jest.requireMock('@/hooks/use-toast') as { mockToast: jest.Mock }).mockToast;

const renderComponent = () =>
  render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>,
  );

describe('ForgotPassword', () => {
  beforeEach(() => {
    mockRequestPasswordReset.mockReset();
    mockToast.mockReset();
  });

  it('shows validation errors when submitting an empty form', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('rejects an invalid email address', async () => {
    renderComponent();

    const emailInput = screen.getByLabelText(/email address/i);

    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.blur(emailInput);
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('requests a password reset with a normalised email and shows success state', async () => {
    mockRequestPasswordReset.mockResolvedValue({ data: { success: true }, error: null });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: ' TestUser@Example.COM ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/reset link sent/i)).toBeInTheDocument();
    });

    expect(mockRequestPasswordReset).toHaveBeenCalledWith('testuser@example.com');
  });

  it('surfaces service errors to the user', async () => {
    mockRequestPasswordReset.mockResolvedValue({ data: null, error: new Error('Service unavailable') });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText('Service unavailable')).toBeInTheDocument();
    });
  });
});
