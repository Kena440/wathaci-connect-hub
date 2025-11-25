import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { GetStartedPage } from '../GetStartedPage';

const mockNavigate = jest.fn();
const mockUpsertProfile = jest.fn();
const mockToast = jest.fn();
const mockUseAppContext = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('@/lib/onboarding', () => ({
  __esModule: true as const,
  upsertProfile: (...args: unknown[]) => mockUpsertProfile(...args),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/contexts/AppContext', () => ({
  useAppContext: () => mockUseAppContext(),
}));

describe('GetStartedPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUpsertProfile.mockReset();
    mockToast.mockReset();
    mockUseAppContext.mockReturnValue({ user: { id: 'user-123' }, loading: false });
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <GetStartedPage />
      </MemoryRouter>
    );

  it('requires professional name when professional is selected', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: /professional/i }));
    await userEvent.type(screen.getByLabelText(/mobile money number/i), '+233501234567');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(
      await screen.findByText('Name or firm name is required for professionals.')
    ).toBeInTheDocument();
    expect(mockUpsertProfile).not.toHaveBeenCalled();
  });

  it.each([
    { accountType: 'donor', button: /donor/i, message: 'Donor name is required to continue.' },
    { accountType: 'investor', button: /investor/i, message: 'Investor name is required to continue.' },
  ])('requires identity name for %s account type', async ({ button, message }) => {
    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: button }));
    await userEvent.type(screen.getByLabelText(/mobile money number/i), '+233555666777');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(mockUpsertProfile).not.toHaveBeenCalled();
  });

  it('validates mobile money number', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: /sme/i }));
    await userEvent.type(screen.getByLabelText(/business name/i), 'Bright Ventures');
    await userEvent.type(screen.getByLabelText(/mobile money number/i), '12345');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(
      await screen.findByText('Enter a valid mobile money number (9-15 digits).')
    ).toBeInTheDocument();
    expect(mockUpsertProfile).not.toHaveBeenCalled();
  });

  it.each([
    {
      accountType: /professional/i,
      identityLabel: /name or firm name/i,
      identityValue: 'Ama Mensah Consulting',
      msisdn: ' +233501234567 ',
      expectedPayload: {
        account_type: 'professional',
        msisdn: '+233501234567',
        full_name: 'Ama Mensah Consulting',
        business_name: 'Ama Mensah Consulting',
      },
      expectedRoute: '/onboarding/professional',
    },
    {
      accountType: /donor/i,
      identityLabel: /donor name/i,
      identityValue: 'Impact Builders Foundation',
      msisdn: '+233555123456',
      expectedPayload: {
        account_type: 'donor',
        msisdn: '+233555123456',
        business_name: 'Impact Builders Foundation',
        full_name: 'Impact Builders Foundation',
      },
      expectedRoute: '/onboarding/investor',
    },
    {
      accountType: /investor/i,
      identityLabel: /investor name/i,
      identityValue: 'Growth Catalyst Partners',
      msisdn: '+233207654321',
      expectedPayload: {
        account_type: 'investor',
        msisdn: '+233207654321',
        business_name: 'Growth Catalyst Partners',
        full_name: 'Growth Catalyst Partners',
      },
      expectedRoute: '/onboarding/investor',
    },
    {
      accountType: /sme/i,
      identityLabel: /business name/i,
      identityValue: '  BrightFuture Enterprises  ',
      msisdn: '+233301122334',
      expectedPayload: {
        account_type: 'sme',
        msisdn: '+233301122334',
        business_name: 'BrightFuture Enterprises',
      },
      expectedRoute: '/onboarding/sme',
    },
  ])('submits profile details for $accountType accounts', async ({
    accountType,
    identityLabel,
    identityValue,
    msisdn,
    expectedPayload,
    expectedRoute,
  }) => {
    mockUpsertProfile.mockResolvedValueOnce(undefined);

    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: accountType }));
    const identityInput = await screen.findByLabelText(identityLabel);
    await userEvent.type(identityInput, identityValue);
    await userEvent.clear(screen.getByLabelText(/mobile money number/i));
    await userEvent.type(screen.getByLabelText(/mobile money number/i), msisdn);

    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(mockUpsertProfile).toHaveBeenCalledWith(expectedPayload);
      expect(mockNavigate).toHaveBeenCalledWith(expectedRoute);
    });
  });
});
