import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';

const mockSignUp = jest.fn().mockResolvedValue({ user: null, profile: null });

jest.mock('@/contexts/AppContext', () => ({
  useAppContext: () => ({
    signIn: jest.fn(),
    signUp: mockSignUp,
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    user: null,
    profile: null,
    loading: false,
    sidebarOpen: false,
    toggleSidebar: jest.fn(),
  }),
}));

const renderSignUpForm = () =>
  render(
    <BrowserRouter>
      <AuthForm mode="signup" />
    </BrowserRouter>,
  );

describe('AuthForm sign-up validation', () => {
  beforeEach(() => {
    mockSignUp.mockClear();
  });

  it('requires full name and mobile number', async () => {
    renderSignUpForm();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'member@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
      expect(screen.getByText('Phone number is required')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('normalizes phone metadata before calling signUp', async () => {
    renderSignUpForm();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'founder@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: '  Jane   Doe  ' } });
    fireEvent.change(screen.getByLabelText(/mobile money number/i), { target: { value: ' +260 955 000 000 ' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
    });

    expect(mockSignUp).toHaveBeenCalledWith(
      'founder@example.com',
      'Password123',
      expect.objectContaining({
        full_name: 'Jane   Doe',
        phone: '+260955000000',
        msisdn: '+260955000000',
        mobile_number: '+260955000000',
        payment_phone: '+260955000000',
        payment_method: 'phone',
        use_same_phone: true,
      }),
    );
  });
});
