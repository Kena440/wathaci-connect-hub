import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { DonateButton } from '../DonateButton';

// Mock the LencoPayment component
jest.mock('../LencoPayment', () => ({
  LencoPayment: ({ amount, description, onSuccess, onCancel }: any) => (
    <div data-testid="lenco-payment">
      <span>Payment for {amount}</span>
      <button onClick={onSuccess}>Success</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('DonateButton Accessibility Tests', () => {
  test('should not have accessibility violations when closed', async () => {
    const { container } = render(<DonateButton />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('should not have accessibility violations when dialog is open', async () => {
    const { container } = render(<DonateButton />);
    
    // Open the dialog
    const donateButton = screen.getByRole('button', { name: /donate/i });
    fireEvent.click(donateButton);
    
    // Check accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('donation amount buttons should be accessible', async () => {
    const { container } = render(<DonateButton />);
    
    // Open the dialog
    const donateButton = screen.getByRole('button', { name: /donate/i });
    fireEvent.click(donateButton);
    
    // Check that amount buttons are accessible
    const amountButtons = screen.getAllByRole('button');
    expect(amountButtons.length).toBeGreaterThan(1);
    
    // Check accessibility after selecting an amount
    const firstAmountButton = screen.getByRole('button', { name: 'ZMW 50' });
    fireEvent.click(firstAmountButton);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('dialog should have proper ARIA attributes', async () => {
    render(<DonateButton />);
    
    // Open the dialog
    const donateButton = screen.getByRole('button', { name: /donate/i });
    fireEvent.click(donateButton);
    
    // Check for dialog role and title
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /support sme development/i })).toBeInTheDocument();
  });
});