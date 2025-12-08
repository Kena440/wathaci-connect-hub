import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { Header } from '../Header';
import { useAppContext } from '@/contexts/AppContext';

jest.mock('@/contexts/AppContext', () => ({
  useAppContext: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() }
  }),
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
  const mockUseAppContext = useAppContext as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation links and sign in button when unauthenticated', () => {
    mockUseAppContext.mockReturnValue({
      user: null,
      profile: null,
      signOut: jest.fn(),
      loading: false,
    });

    renderHeader();

    // The mock translation function returns the key itself, so we check for those keys
    const navLinks = ['home', 'marketplace', 'freelancerHub', 'resources', 'partnershipHub', 'fundingHub', 'aboutUs'];
    navLinks.forEach((text) => {
      expect(screen.getByText(text)).toBeInTheDocument();
    });

    expect(screen.getByText('signIn')).toBeInTheDocument();
  });

  it('keeps sign in button visible while auth status is loading and unauthenticated', () => {
    mockUseAppContext.mockReturnValue({
      user: null,
      profile: null,
      signOut: jest.fn(),
      loading: true,
    });

    renderHeader();

    expect(screen.getByText('signIn')).toBeInTheDocument();
  });

  it('shows sign out option for authenticated users', async () => {
    mockUseAppContext.mockReturnValue({
      user: { email: 'user@example.com', profile_completed: true },
      profile: null, // Profile not loaded yet
      signOut: jest.fn(),
      loading: false,
    });

    renderHeader();

    const userButton = screen.getByText('user');
    await userEvent.click(userButton);

    expect(screen.getByText('signOut')).toBeInTheDocument();
  });

  it('toggles mobile menu', async () => {
    mockUseAppContext.mockReturnValue({
      user: null,
      profile: null,
      signOut: jest.fn(),
      loading: false,
    });

    const { container } = renderHeader();

    expect(screen.getAllByRole('navigation')).toHaveLength(1);

    const toggle = screen.getAllByRole('button').find(btn => btn.textContent === '');
    await userEvent.click(toggle!);

    expect(screen.getAllByRole('navigation')).toHaveLength(2);
  });

  it('displays first name when profile is loaded', () => {
    mockUseAppContext.mockReturnValue({
      user: { email: 'john.doe@example.com', profile_completed: true },
      profile: { first_name: 'John', last_name: 'Doe' },
      signOut: jest.fn(),
      loading: false,
    });

    renderHeader();

    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('falls back to email prefix when profile first_name is not available', () => {
    mockUseAppContext.mockReturnValue({
      user: { email: 'john.doe@example.com', profile_completed: true },
      profile: { last_name: 'Doe' }, // no first_name
      signOut: jest.fn(),
      loading: false,
    });

    renderHeader();

    expect(screen.getByText('john.doe')).toBeInTheDocument();
  });
});

