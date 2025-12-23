import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const createLazyMock = (label: string, namedExport?: string) => {
  const Component = () => <div>{label}</div>;
  return {
    __esModule: true as const,
    default: Component,
    ...(namedExport ? { [namedExport]: Component } : {}),
  };
};

jest.mock('../pages/Index', () => createLazyMock('Home Page'));
jest.mock('../pages/Marketplace', () => createLazyMock('Marketplace Page'));
jest.mock('../pages/Resources', () => createLazyMock('Resources Page'));
jest.mock('../pages/NotFound', () => createLazyMock('Not Found'));
jest.mock('../pages/SignIn', () => createLazyMock('Sign In Page', 'SignIn'));
jest.mock('../pages/SignUp', () => createLazyMock('Sign Up Page', 'SignUp'));
jest.mock('../pages/ForgotPassword', () => createLazyMock('Forgot Password Page'));
jest.mock('../pages/ResetPassword', () => createLazyMock('Reset Password Page'));
jest.mock('../pages/GetStartedPage', () =>
  createLazyMock('Get Started Page', 'GetStartedPage')
);
jest.mock('../pages/SubscriptionPlans', () => createLazyMock('Subscription Plans Page', 'SubscriptionPlans'));
jest.mock('../pages/PartnershipHub', () => createLazyMock('Partnership Hub Page', 'PartnershipHub'));
jest.mock('../pages/ProfileSetup', () => createLazyMock('Profile Setup Page', 'ProfileSetup'));
jest.mock('../components/ProfileReview', () => createLazyMock('Profile Review Page', 'ProfileReview'));
jest.mock('../pages/FreelancerHub', () => createLazyMock('Freelancer Hub Page'));
jest.mock('../pages/PrivacyPolicy', () => createLazyMock('Privacy Policy Page'));
jest.mock('../pages/TermsOfService', () => createLazyMock('Terms Of Service Page'));
jest.mock('../pages/Messages', () => createLazyMock('Messages Page'));
jest.mock('../pages/FundingHub', () => createLazyMock('Funding Hub Page'));
jest.mock('../components/AppLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../components/AccountTypeRoute', () => ({
  AccountTypeRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const authState: { user: { id: string } | null } = { user: null };

jest.mock('../components/auth/RequireAuth', () => ({
  RequireAuth: ({ children }: { children: React.ReactNode }) =>
    authState.user ? <>{children}</> : <div>Sign In Page</div>,
  RequireCompletedProfile: ({ children }: { children: React.ReactNode }) =>
    authState.user ? <>{children}</> : <div>Complete Profile</div>,
}));

jest.mock('../components/PrivateRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) =>
    authState.user ? <>{children}</> : <div>Sign In Page</div>,
}));

import { AppRoutes } from '../AppRoutes';

const publicRoutes = [
  { path: '/', text: 'Home Page' },
  { path: '/marketplace', text: 'Marketplace Page' },
  { path: '/freelancer-hub', text: 'Freelancer Hub Page' },
  { path: '/resources', text: 'Resources Page' },
  { path: '/signin', text: 'Sign In Page' },
  { path: '/signup', text: 'Sign Up Page' },
  { path: '/forgot-password', text: 'Forgot Password Page' },
  { path: '/reset-password', text: 'Reset Password Page' },
  { path: '/profile-setup', text: 'Profile Setup Page' },
  { path: '/profile-review', text: 'Profile Review Page' },
  { path: '/subscription-plans', text: 'Subscription Plans Page' },
  { path: '/partnership-hub', text: 'Partnership Hub Page' },
  { path: '/privacy-policy', text: 'Privacy Policy Page' },
  { path: '/terms-of-service', text: 'Terms Of Service Page' },
];

const protectedRoutes = [
  { path: '/messages', text: 'Messages Page' },
  { path: '/get-started', text: 'Get Started Page' },
];

describe('AppRoutes', () => {
  it.each(publicRoutes)('renders %s', async ({ path, text }) => {
    authState.user = null;
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  describe('protected routes', () => {
    it.each(protectedRoutes)('redirects unauthenticated users from %s', async ({ path }) => {
      authState.user = null;
      render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      );
      expect(await screen.findByText('Sign In Page')).toBeInTheDocument();
    });

    it.each(protectedRoutes)('renders %s when authenticated', async ({ path, text }) => {
      authState.user = { id: '1' };
      render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      );
      expect(await screen.findByText(text)).toBeInTheDocument();
    });
  });

  it('renders NotFound for unknown paths', async () => {
    authState.user = null;
    render(
      <MemoryRouter initialEntries={['/unknown']}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(await screen.findByText('Not Found')).toBeInTheDocument();
  });
});
