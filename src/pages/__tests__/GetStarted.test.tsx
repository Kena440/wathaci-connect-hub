import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GetStarted } from '../GetStarted';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseAppContext = jest.fn();

jest.mock('@/contexts/AppContext', () => ({
  useAppContext: () => mockUseAppContext(),
}));

describe('GetStarted navigation flows', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseAppContext.mockReset();
  });

  it('redirects unauthenticated users to the signup flow with the selected account type', () => {
    mockUseAppContext.mockReturnValue({ user: null, profile: null });

    render(
      <MemoryRouter>
        <GetStarted />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /start as sole proprietor/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/signup?accountType=sole_proprietor');
  });

  it('sends authenticated users without completed profiles to profile setup', () => {
    mockUseAppContext.mockReturnValue({
      user: { id: 'user-1', profile_completed: false },
      profile: { account_type: 'professional', profile_completed: false },
    });

    render(
      <MemoryRouter>
        <GetStarted />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /start as professional/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/profile-setup?accountType=professional');
  });

  it('re-routes users with completed profiles for a different account type to profile setup in edit mode', () => {
    mockUseAppContext.mockReturnValue({
      user: { id: 'user-1', profile_completed: true },
      profile: { account_type: 'sme', profile_completed: true },
    });

    render(
      <MemoryRouter>
        <GetStarted />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /start as investor/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/profile-setup?accountType=investor&mode=edit');
  });

  it('directs users with completed matching profiles to the appropriate assessment route', () => {
    mockUseAppContext.mockReturnValue({
      user: { id: 'user-2', profile_completed: true },
      profile: { account_type: 'investor', profile_completed: true },
    });

    render(
      <MemoryRouter>
        <GetStarted />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /start as investor/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/investor-assessment');
  });
});

