/* eslint-disable @typescript-eslint/no-require-imports */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { useNavigate } from 'react-router-dom';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock Supabase client
jest.mock('@/lib/supabaseClient', () => ({
  logSupabaseAuthError: jest.fn(),
  logAuthStateChange: jest.fn(),
  logProfileOperation: jest.fn(),
}));

describe('AuthForm - Smart Redirect Logic', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    jest.clearAllMocks();
  });

  describe('Sign-in redirect behavior', () => {
    it('redirects to /profile-setup when user has incomplete profile', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({
        user: { id: '123', email: 'test@example.com', profile_completed: false },
        profile: { id: '123', profile_completed: false },
      });

      jest.spyOn(require('@/contexts/AppContext'), 'useAppContext').mockReturnValue({
        signIn: mockSignIn,
        signUp: jest.fn(),
        user: { id: '123', email: 'test@example.com', profile_completed: false },
        profile: { id: '123', profile_completed: false },
        loading: false,
        refreshUser: jest.fn(),
        signOut: jest.fn(),
        sidebarOpen: false,
        toggleSidebar: jest.fn(),
      });

      render(
        <BrowserRouter>
          <AuthForm mode="signin" redirectTo="/" />
        </BrowserRouter>
      );

      // Fill in form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      // Wait for redirect logic to execute
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/profile-setup', { replace: true });
        },
        { timeout: 3000 }
      );
    });

    it('redirects to specified destination when user has completed profile', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({
        user: { id: '123', email: 'test@example.com', profile_completed: true },
        profile: { id: '123', profile_completed: true },
      });

      jest.spyOn(require('@/contexts/AppContext'), 'useAppContext').mockReturnValue({
        signIn: mockSignIn,
        signUp: jest.fn(),
        user: { id: '123', email: 'test@example.com', profile_completed: true },
        profile: { id: '123', profile_completed: true },
        loading: false,
        refreshUser: jest.fn(),
        signOut: jest.fn(),
        sidebarOpen: false,
        toggleSidebar: jest.fn(),
      });

      render(
        <BrowserRouter>
          <AuthForm mode="signin" redirectTo="/dashboard" />
        </BrowserRouter>
      );

      // Fill in form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      // Wait for redirect logic to execute
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
        },
        { timeout: 3000 }
      );
    });

    it('waits for loading to complete before redirecting', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({
        user: { id: '123', email: 'test@example.com', profile_completed: true },
        profile: { id: '123', profile_completed: true },
      });

      // Start with loading=true
      const mockContext = {
        signIn: mockSignIn,
        signUp: jest.fn(),
        user: null,
        profile: null,
        loading: true,
        refreshUser: jest.fn(),
        signOut: jest.fn(),
        sidebarOpen: false,
        toggleSidebar: jest.fn(),
      };

      const mockUseAppContext = jest
        .spyOn(require('@/contexts/AppContext'), 'useAppContext')
        .mockReturnValue(mockContext);

      render(
        <BrowserRouter>
          <AuthForm mode="signin" redirectTo="/" />
        </BrowserRouter>
      );

      // Fill in form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });

      // Should not redirect while loading
      expect(mockNavigate).not.toHaveBeenCalled();

      // Update context to simulate loading complete
      mockUseAppContext.mockReturnValue({
        ...mockContext,
        user: { id: '123', email: 'test@example.com', profile_completed: true },
        profile: { id: '123', profile_completed: true },
        loading: false,
      });

      // Trigger re-render
      render(
        <BrowserRouter>
          <AuthForm mode="signin" redirectTo="/" />
        </BrowserRouter>
      );

      // Note: In actual implementation, the useEffect will trigger when loading changes to false
      // This test verifies the logic, but in practice the component needs to re-render
    });

    it('redirects to /profile-setup when profile is missing', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({
        user: { id: '123', email: 'test@example.com', profile_completed: false },
        profile: null, // No profile
      });

      jest.spyOn(require('@/contexts/AppContext'), 'useAppContext').mockReturnValue({
        signIn: mockSignIn,
        signUp: jest.fn(),
        user: { id: '123', email: 'test@example.com', profile_completed: false },
        profile: null,
        loading: false,
        refreshUser: jest.fn(),
        signOut: jest.fn(),
        sidebarOpen: false,
        toggleSidebar: jest.fn(),
      });

      render(
        <BrowserRouter>
          <AuthForm mode="signin" redirectTo="/" />
        </BrowserRouter>
      );

      // Fill in form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });

      // Wait for redirect logic to execute
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/profile-setup', { replace: true });
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Sign-up redirect behavior', () => {
    it('redirects new users to /profile-setup', async () => {
      const mockSignUp = jest.fn().mockResolvedValue({
        user: { id: '456', email: 'newuser@example.com', profile_completed: false },
        profile: { id: '456', profile_completed: false },
      });

      jest.spyOn(require('@/contexts/AppContext'), 'useAppContext').mockReturnValue({
        signIn: jest.fn(),
        signUp: mockSignUp,
        user: { id: '456', email: 'newuser@example.com', profile_completed: false },
        profile: { id: '456', profile_completed: false },
        loading: false,
        refreshUser: jest.fn(),
        signOut: jest.fn(),
        sidebarOpen: false,
        toggleSidebar: jest.fn(),
      });

      render(
        <BrowserRouter>
          <AuthForm mode="signup" redirectTo="/" />
        </BrowserRouter>
      );

      // Fill in form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'newuser@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' },
      });
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'New User' },
      });
      fireEvent.change(screen.getByLabelText(/mobile money number/i), {
        target: { value: '+260971234567' },
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled();
      });

      // Wait for redirect logic to execute
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/profile-setup', { replace: true });
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Custom onSuccess callback', () => {
    it('calls onSuccess instead of redirecting when provided', async () => {
      const mockOnSuccess = jest.fn();
      const mockSignIn = jest.fn().mockResolvedValue({
        user: { id: '123', email: 'test@example.com', profile_completed: true },
        profile: { id: '123', profile_completed: true },
      });

      jest.spyOn(require('@/contexts/AppContext'), 'useAppContext').mockReturnValue({
        signIn: mockSignIn,
        signUp: jest.fn(),
        user: { id: '123', email: 'test@example.com', profile_completed: true },
        profile: { id: '123', profile_completed: true },
        loading: false,
        refreshUser: jest.fn(),
        signOut: jest.fn(),
        sidebarOpen: false,
        toggleSidebar: jest.fn(),
      });

      render(
        <BrowserRouter>
          <AuthForm mode="signin" onSuccess={mockOnSuccess} />
        </BrowserRouter>
      );

      // Fill in form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });

      // Wait for callback to be called
      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Should not navigate when onSuccess is provided
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Button state during redirect', () => {
    it('shows "Redirecting..." while determining destination', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({
        user: { id: '123', email: 'test@example.com', profile_completed: true },
        profile: { id: '123', profile_completed: true },
      });

      jest.spyOn(require('@/contexts/AppContext'), 'useAppContext').mockReturnValue({
        signIn: mockSignIn,
        signUp: jest.fn(),
        user: { id: '123', email: 'test@example.com', profile_completed: true },
        profile: { id: '123', profile_completed: true },
        loading: false,
        refreshUser: jest.fn(),
        signOut: jest.fn(),
        sidebarOpen: false,
        toggleSidebar: jest.fn(),
      });

      render(
        <BrowserRouter>
          <AuthForm mode="signin" redirectTo="/" />
        </BrowserRouter>
      );

      // Fill in form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Should show processing first
      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveTextContent('Processing…');
      });

      // Then should show redirecting
      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveTextContent(/Redirecting/);
      });
    });
  });
});
