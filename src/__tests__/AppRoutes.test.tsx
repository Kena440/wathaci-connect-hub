import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../pages/Index', () => ({ default: () => <div>Home Page</div> }));
jest.mock('../pages/Marketplace', () => ({ default: () => <div>Marketplace Page</div> }));
jest.mock('../pages/Resources', () => ({ default: () => <div>Resources Page</div> }));
jest.mock('../pages/NotFound', () => ({ default: () => <div>Not Found</div> }));
jest.mock('../pages/SignIn', () => ({ SignIn: () => <div>Sign In Page</div> }));
jest.mock('../pages/ForgotPassword', () => ({ default: () => <div>Forgot Password Page</div> }));
jest.mock('../pages/ResetPassword', () => ({ default: () => <div>Reset Password Page</div> }));
jest.mock('../pages/GetStarted', () => ({ GetStarted: () => <div>Get Started Page</div> }));
jest.mock('../pages/SubscriptionPlans', () => ({ SubscriptionPlans: () => <div>Subscription Plans Page</div> }));
jest.mock('../pages/PartnershipHub', () => ({ PartnershipHub: () => <div>Partnership Hub Page</div> }));
jest.mock('../pages/ProfileSetup', () => ({ ProfileSetup: () => <div>Profile Setup Page</div> }));
jest.mock('../components/ProfileReview', () => ({ ProfileReview: () => <div>Profile Review Page</div> }));
jest.mock('../pages/FreelancerHub', () => ({ default: () => <div>Freelancer Hub Page</div> }));
jest.mock('../pages/PrivacyPolicy', () => ({ default: () => <div>Privacy Policy Page</div> }));
jest.mock('../pages/TermsOfService', () => ({ default: () => <div>Terms Of Service Page</div> }));
jest.mock('../pages/Messages', () => ({ default: () => <div>Messages Page</div> }));
jest.mock('../pages/FundingHub', () => ({ default: () => <div>Funding Hub Page</div> }));

const appContextMock: { user: { id: string } | null } = { user: null };
jest.mock('@/contexts/AppContext', () => ({
  useAppContext: () => ({ user: appContextMock.user, loading: false }),
}));

import { AppRoutes } from '../App';

const publicRoutes = [
  { path: '/', text: 'Home Page' },
  { path: '/marketplace', text: 'Marketplace Page' },
  { path: '/freelancer-hub', text: 'Freelancer Hub Page' },
  { path: '/resources', text: 'Resources Page' },
  { path: '/signin', text: 'Sign In Page' },
  { path: '/forgot-password', text: 'Forgot Password Page' },
  { path: '/reset-password', text: 'Reset Password Page' },
  { path: '/get-started', text: 'Get Started Page' },
  { path: '/profile-setup', text: 'Profile Setup Page' },
  { path: '/profile-review', text: 'Profile Review Page' },
  { path: '/subscription-plans', text: 'Subscription Plans Page' },
  { path: '/partnership-hub', text: 'Partnership Hub Page' },
  { path: '/privacy-policy', text: 'Privacy Policy Page' },
  { path: '/terms-of-service', text: 'Terms Of Service Page' },
];

const protectedRoutes = [
  { path: '/messages', text: 'Messages Page' },
  { path: '/funding-hub', text: 'Funding Hub Page' },
];

describe('AppRoutes', () => {
  it.each(publicRoutes)('renders %s', async ({ path, text }) => {
    appContextMock.user = null;
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  describe('protected routes', () => {
    it.each(protectedRoutes)('redirects unauthenticated users from %s', async ({ path }) => {
      appContextMock.user = null;
      render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      );
      expect(await screen.findByText('Sign In Page')).toBeInTheDocument();
    });

    it.each(protectedRoutes)('renders %s when authenticated', async ({ path, text }) => {
      appContextMock.user = { id: '1' };
      render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      );
      expect(await screen.findByText(text)).toBeInTheDocument();
    });
  });

  it('renders NotFound for unknown paths', async () => {
    appContextMock.user = null;
    render(
      <MemoryRouter initialEntries={['/unknown']}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(await screen.findByText('Not Found')).toBeInTheDocument();
  });
});
