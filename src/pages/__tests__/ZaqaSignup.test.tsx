import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

// Mock Supabase client before imports
const mockSignUp = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/wathaciSupabaseClient', () => ({
  supabaseClient: {
    auth: {
      signUp: mockSignUp,
    },
    from: mockFrom,
  },
}));

// Now import the component after mocks are set up
import ZaqaSignup from '../ZaqaSignup';

const ZaqaSignupWrapper = () => (
  <BrowserRouter>
    <ZaqaSignup />
  </BrowserRouter>
);

describe('ZaqaSignup - Account Type Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main heading', () => {
    render(<ZaqaSignupWrapper />);
    expect(screen.getByText('Sign up. It is fast and easy.')).toBeInTheDocument();
  });

  it('displays all 6 account types', () => {
    render(<ZaqaSignupWrapper />);
    
    expect(screen.getByText('Sole Proprietor')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('SME (Small & Medium Enterprise)')).toBeInTheDocument();
    expect(screen.getByText('Investor')).toBeInTheDocument();
    expect(screen.getByText('Donor')).toBeInTheDocument();
    expect(screen.getByText('Government Institution')).toBeInTheDocument();
  });

  it('shows error when trying to continue without selecting account type', () => {
    render(<ZaqaSignupWrapper />);
    
    const continueButton = screen.getByRole('button', { name: /continue to sign up/i });
    fireEvent.click(continueButton);
    
    expect(screen.getByText('Please select an account type to continue.')).toBeInTheDocument();
  });

  it('allows selecting an account type and proceeding to form', () => {
    render(<ZaqaSignupWrapper />);
    
    // Select SME account type
    const smeOption = screen.getByLabelText(/SME \(Small & Medium Enterprise\)/i);
    fireEvent.click(smeOption);
    
    // Continue to form
    const continueButton = screen.getByRole('button', { name: /continue to sign up/i });
    fireEvent.click(continueButton);
    
    // Should now be on the form step
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
  });
});

describe('ZaqaSignup - Registration Form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful upsert
    mockFrom.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    });
  });

  const fillFormAndSelectAccountType = () => {
    render(<ZaqaSignupWrapper />);
    
    // Select account type
    const professionalOption = screen.getByLabelText(/^Professional/i);
    fireEvent.click(professionalOption);
    
    // Continue to form
    const continueButton = screen.getByRole('button', { name: /continue to sign up/i });
    fireEvent.click(continueButton);
  };

  it('displays all required form fields', () => {
    fillFormAndSelectAccountType();
    
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('displays Terms & Conditions checkbox (required)', () => {
    fillFormAndSelectAccountType();
    
    const termsCheckbox = screen.getByRole('checkbox', { name: /terms & conditions/i });
    expect(termsCheckbox).toBeInTheDocument();
    expect(termsCheckbox).not.toBeChecked();
  });

  it('displays newsletter opt-in checkbox (optional)', () => {
    fillFormAndSelectAccountType();
    
    const newsletterCheckbox = screen.getByRole('checkbox', { name: /newsletter monthly/i });
    expect(newsletterCheckbox).toBeInTheDocument();
    expect(newsletterCheckbox).not.toBeChecked();
  });

  it('validates email format', async () => {
    fillFormAndSelectAccountType();
    
    const termsCheckbox = screen.getByRole('checkbox', { name: /terms & conditions/i });
    const form = screen.getByRole('button', { name: /sign up now/i }).closest('form');
    
    // Fill form with invalid email
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123' } });
    fireEvent.click(termsCheckbox);
    
    // Submit form (bypassing HTML5 validation for test)
    if (form) {
      fireEvent.submit(form);
    }
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    fillFormAndSelectAccountType();
    
    const termsCheckbox = screen.getByRole('checkbox', { name: /terms & conditions/i });
    const submitButton = screen.getByRole('button', { name: /sign up now/i });
    
    // Fill form with short password
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Short1' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Short1' } });
    fireEvent.click(termsCheckbox);
    
    // Try to submit
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('validates password match', async () => {
    fillFormAndSelectAccountType();
    
    const termsCheckbox = screen.getByRole('checkbox', { name: /terms & conditions/i });
    const submitButton = screen.getByRole('button', { name: /sign up now/i });
    
    // Fill form with non-matching passwords
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'DifferentPass123' } });
    fireEvent.click(termsCheckbox);
    
    // Try to submit
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('requires Terms & Conditions acceptance', async () => {
    fillFormAndSelectAccountType();
    
    const submitButton = screen.getByRole('button', { name: /sign up now/i });
    
    // Fill form without checking terms
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123' } });
    
    // Try to submit
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/you must accept the terms & conditions/i)).toBeInTheDocument();
    });
  });

  it('successfully submits with valid data and terms accepted', async () => {
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: 'test-user-id', email: 'john@example.com' },
        session: null, // Email confirmation required
      },
      error: null,
    });
    
    fillFormAndSelectAccountType();
    
    const termsCheckbox = screen.getByRole('checkbox', { name: /terms & conditions/i });
    const newsletterCheckbox = screen.getByRole('checkbox', { name: /newsletter monthly/i });
    const submitButton = screen.getByRole('button', { name: /sign up now/i });
    
    // Fill form completely
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123' } });
    fireEvent.click(termsCheckbox);
    fireEvent.click(newsletterCheckbox);
    
    // Submit
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'Password123',
        options: {
          data: {
            account_type: 'professional',
            full_name: 'John Doe',
          },
        },
      });
    });
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
    });
  });

  it('stores newsletter opt-in preference correctly', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
    });
    
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: 'test-user-id', email: 'john@example.com' },
        session: null,
      },
      error: null,
    });
    
    fillFormAndSelectAccountType();
    
    const termsCheckbox = screen.getByRole('checkbox', { name: /terms & conditions/i });
    const newsletterCheckbox = screen.getByRole('checkbox', { name: /newsletter monthly/i });
    const submitButton = screen.getByRole('button', { name: /sign up now/i });
    
    // Fill form with newsletter opt-in
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123' } });
    fireEvent.click(termsCheckbox);
    fireEvent.click(newsletterCheckbox); // Opt into newsletter
    
    // Submit
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          accepted_terms: true,
          newsletter_opt_in: true,
        }),
        { onConflict: 'id' }
      );
    });
  });
});

describe('ZaqaSignup - Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "Already have an account? Login" link on account type step', () => {
    render(<ZaqaSignupWrapper />);
    
    const loginLink = screen.getByRole('link', { name: /login/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/signin');
  });

  it('allows changing account type from the form step', () => {
    render(<ZaqaSignupWrapper />);
    
    // Select account type
    const smeOption = screen.getByLabelText(/SME \(Small & Medium Enterprise\)/i);
    fireEvent.click(smeOption);
    
    // Continue to form
    fireEvent.click(screen.getByRole('button', { name: /continue to sign up/i }));
    
    // Should be on form step
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    
    // Click change button
    const changeButton = screen.getByRole('button', { name: /change/i });
    fireEvent.click(changeButton);
    
    // Should be back on account type selection
    expect(screen.getByText('Select Account Type')).toBeInTheDocument();
  });
});
