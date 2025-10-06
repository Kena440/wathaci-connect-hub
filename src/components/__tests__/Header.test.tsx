import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';

import { Header } from '../Header';
import { useAppContext } from '@/contexts/AppContext';

jest.mock('@/contexts/AppContext', () => ({
  useAppContext: jest.fn(),
}));

jest.mock('../NotificationCenter', () => ({
  NotificationCenter: () => <div data-testid="notification-center" />,
}));

jest.mock('../DonateButton', () => ({
  DonateButton: () => <div>Donate</div>,
}));

const renderHeader = () => {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
};

describe('Header', () => {
  const mockUseAppContext = useAppContext as jest.MockedFunction<typeof useAppContext>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation links and sign in button when unauthenticated', () => {
    mockUseAppContext.mockReturnValue({
      user: null,
      signOut: jest.fn(),
      loading: false,
      sidebarOpen: false,
      toggleSidebar: jest.fn(),
      profile: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      refreshUser: jest.fn(),
    });

    renderHeader();

    const navLinks = ['Home', 'Marketplace', 'Freelancer Hub', 'Resources', 'Partnership Hub'];
    navLinks.forEach((text) => {
      expect(screen.getByText(text)).toBeTruthy();
    });

    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('shows sign out option for authenticated users', async () => {
    mockUseAppContext.mockReturnValue({
      user: { email: 'user@example.com', id: '123' } as any,
      signOut: jest.fn(),
      loading: false,
      sidebarOpen: false,
      toggleSidebar: jest.fn(),
      profile: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      refreshUser: jest.fn(),
    });

    renderHeader();

    const userButton = screen.getByText('user');
    await userEvent.click(userButton);

    expect(screen.getByText('Sign Out')).toBeTruthy();
  });

  it('toggles mobile menu', async () => {
    mockUseAppContext.mockReturnValue({
      user: null,
      signOut: jest.fn(),
      loading: false,
      sidebarOpen: false,
      toggleSidebar: jest.fn(),
      profile: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      refreshUser: jest.fn(),
    });

    const { container } = renderHeader();

    expect(screen.getAllByRole('navigation')).toHaveLength(1);

    const toggle = screen.getAllByRole('button').find(btn => btn.textContent === '');
    await userEvent.click(toggle!);

    expect(screen.getAllByRole('navigation')).toHaveLength(2);
  });
});

