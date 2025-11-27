import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPassword from '../ResetPassword';

jest.mock('@/lib/services', () => {
  const mockGetSessionFromUrl = jest.fn();
  const mockGetUser = jest.fn();
  const mockUpdatePassword = jest.fn();

  return {
    __esModule: true,
    supabase: {
      auth: {
        getSessionFromUrl: mockGetSessionFromUrl,
        getUser: mockGetUser,
      },
    },
    userService: {
      updatePassword: mockUpdatePassword,
    },
    mockGetSessionFromUrl,
    mockGetUser,
    mockUpdatePassword,
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

const serviceMocks = jest.requireMock('@/lib/services') as {
  mockGetSessionFromUrl: jest.Mock;
  mockGetUser: jest.Mock;
  mockUpdatePassword: jest.Mock;
};
const mockGetSessionFromUrl = serviceMocks.mockGetSessionFromUrl;
const mockGetUser = serviceMocks.mockGetUser;
const mockUpdatePassword = serviceMocks.mockUpdatePassword;
const mockToast = (jest.requireMock('@/hooks/use-toast') as { mockToast: jest.Mock }).mockToast;

const renderComponent = () =>
  render(
    <MemoryRouter initialEntries={["/reset-password"]}>
      <ResetPassword />
    </MemoryRouter>,
  );

describe('ResetPassword', () => {
  beforeEach(() => {
    mockGetSessionFromUrl.mockReset().mockResolvedValue({ data: { session: {} }, error: null });
    mockGetUser.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockUpdatePassword.mockReset().mockResolvedValue({ data: { success: true }, error: null });
    mockToast.mockReset();
    window.history.pushState({}, '', '/reset-password#type=recovery');
  });

  it('validates matching passwords before submitting', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Mismatch123' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('shows an error when the recovery link is invalid', async () => {
    mockGetSessionFromUrl.mockResolvedValueOnce({ data: null, error: new Error('Invalid token') });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText('This password reset link is invalid or has expired. Please request a new one.'),
      ).toBeInTheDocument();
    });
  });

  it('submits a valid password update and shows success', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('Password123');
      expect(screen.getByText(/password updated/i)).toBeInTheDocument();
    });
  });

  it('shows a service error returned from the API', async () => {
    mockUpdatePassword.mockResolvedValueOnce({ data: null, error: new Error('Reset failed') });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText('Reset failed')).toBeInTheDocument();
    });
  });
});
