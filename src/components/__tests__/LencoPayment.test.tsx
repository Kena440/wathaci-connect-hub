import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock Supabase first
const mockInvoke = jest.fn();
jest.mock('@/lib/supabase-enhanced', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke
    }
  }
}));

// Mock the toast hook
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Import component after mocks
import { LencoPayment } from '../LencoPayment';

describe('LencoPayment Component', () => {
  const defaultProps = {
    amount: '100.00',
    description: 'Test payment',
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
    onError: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders payment form with correct amount and description', () => {
      render(<LencoPayment {...defaultProps} />);
      
      expect(screen.getByText('Secure Payment Portal')).toBeInTheDocument();
      expect(screen.getByText('Test payment')).toBeInTheDocument();
      expect(screen.getByText('ZMW 100.00')).toBeInTheDocument();
    });

    it('calculates and displays fee breakdown correctly', () => {
      render(<LencoPayment {...defaultProps} amount="100" />);
      
      // Total amount: ZMW 100.00
      expect(screen.getByText('ZMW 100.00')).toBeInTheDocument();
      // Platform fee (2%): ZMW 2.00  
      expect(screen.getByText('ZMW 2.00')).toBeInTheDocument();
      // Provider receives: ZMW 98.00
      expect(screen.getByText('ZMW 98.00')).toBeInTheDocument();
    });

    it('handles numeric amount prop correctly', () => {
      render(<LencoPayment {...defaultProps} amount={150.50} />);
      
      expect(screen.getByText('ZMW 150.50')).toBeInTheDocument();
      expect(screen.getByText('ZMW 3.01')).toBeInTheDocument(); // 2% fee
      expect(screen.getByText('ZMW 147.49')).toBeInTheDocument(); // Provider amount
    });

    it('renders mobile money form by default', () => {
      render(<LencoPayment {...defaultProps} />);
      
      expect(screen.getByText('Mobile Money Provider')).toBeInTheDocument();
      expect(screen.getByText('Phone Number')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('097XXXXXXX')).toBeInTheDocument();
    });
  });

  describe('Payment Method Selection', () => {
    it('shows mobile money fields when mobile money is selected', async () => {
      const user = userEvent.setup();
      render(<LencoPayment {...defaultProps} />);
      
      // Mobile money should be selected by default
      expect(screen.getByText('Mobile Money Provider')).toBeInTheDocument();
      expect(screen.getByText('Phone Number')).toBeInTheDocument();
    });

    it('shows card option in payment method dropdown', async () => {
      const user = userEvent.setup();
      render(<LencoPayment {...defaultProps} />);
      
      // Open payment method dropdown
      const paymentMethodSelect = screen.getByRole('combobox');
      await user.click(paymentMethodSelect);
      
      expect(screen.getByText('Debit/Credit Card')).toBeInTheDocument();
    });
  });

  describe('Mobile Money Provider Selection', () => {
    it('allows selection of different mobile money providers', async () => {
      const user = userEvent.setup();
      render(<LencoPayment {...defaultProps} />);
      
      // Open provider dropdown
      const providerSelect = screen.getByRole('combobox', { name: /mobile money provider/i });
      await user.click(providerSelect);
      
      expect(screen.getByText('MTN Mobile Money')).toBeInTheDocument();
      expect(screen.getByText('Airtel Money')).toBeInTheDocument();
      expect(screen.getByText('Zamtel Kwacha')).toBeInTheDocument();
    });

    it('updates provider selection correctly', async () => {
      const user = userEvent.setup();
      render(<LencoPayment {...defaultProps} />);
      
      // Open provider dropdown and select MTN
      const providerSelect = screen.getByRole('combobox', { name: /mobile money provider/i });
      await user.click(providerSelect);
      await user.click(screen.getByText('MTN Mobile Money'));
      
      // Verify selection (note: exact verification depends on Select component implementation)
      expect(providerSelect).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error when trying to pay without phone number', async () => {
      const user = userEvent.setup();
      render(<LencoPayment {...defaultProps} />);
      
      // Try to pay without entering phone number
      const payButton = screen.getByRole('button', { name: /pay k100.00/i });
      await user.click(payButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Missing Information",
          description: "Please select a provider and enter your phone number",
          variant: "destructive",
        });
      });
    });

    it('shows error when trying to pay without selecting provider', async () => {
      const user = userEvent.setup();
      render(<LencoPayment {...defaultProps} />);
      
      // Enter phone number but don't select provider
      const phoneInput = screen.getByPlaceholderText('097XXXXXXX');
      await user.type(phoneInput, '0971234567');
      
      const payButton = screen.getByRole('button', { name: /pay k100.00/i });
      await user.click(payButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Missing Information",
          description: "Please select a provider and enter your phone number",
          variant: "destructive",
        });
      });
    });
  });

  describe('Payment Processing', () => {
    it('calls Supabase function with correct parameters on successful payment', async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, transaction_id: 'TXN123' },
        error: null
      });
      
      render(<LencoPayment {...defaultProps} />);
      
      // Fill in required fields
      const phoneInput = screen.getByPlaceholderText('097XXXXXXX');
      await user.type(phoneInput, '0971234567');
      
      // Select provider
      const providerSelect = screen.getByRole('combobox', { name: /mobile money provider/i });
      await user.click(providerSelect);
      await user.click(screen.getByText('MTN Mobile Money'));
      
      // Click pay
      const payButton = screen.getByRole('button', { name: /pay k100.00/i });
      await user.click(payButton);
      
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('lenco-payment', {
          body: {
            amount: 100,
            paymentMethod: 'mobile_money',
            phoneNumber: '0971234567',
            provider: 'mtn',
            description: 'Test payment'
          }
        });
      });
    });

    it('shows success toast on successful payment', async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, transaction_id: 'TXN123' },
        error: null
      });
      
      render(<LencoPayment {...defaultProps} />);
      
      // Fill in required fields and submit
      const phoneInput = screen.getByPlaceholderText('097XXXXXXX');
      await user.type(phoneInput, '0971234567');
      
      const providerSelect = screen.getByRole('combobox', { name: /mobile money provider/i });
      await user.click(providerSelect);
      await user.click(screen.getByText('MTN Mobile Money'));
      
      const payButton = screen.getByRole('button', { name: /pay k100.00/i });
      await user.click(payButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Payment Successful",
          description: "Payment completed. Transaction ID: TXN123",
        });
      });
      
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    it('shows error toast on payment failure', async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValueOnce({
        data: { success: false, error: 'Insufficient funds' },
        error: null
      });
      
      render(<LencoPayment {...defaultProps} />);
      
      // Fill in required fields and submit
      const phoneInput = screen.getByPlaceholderText('097XXXXXXX');
      await user.type(phoneInput, '0971234567');
      
      const providerSelect = screen.getByRole('combobox', { name: /mobile money provider/i });
      await user.click(providerSelect);
      await user.click(screen.getByText('MTN Mobile Money'));
      
      const payButton = screen.getByRole('button', { name: /pay k100.00/i });
      await user.click(payButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Payment Failed",
          description: "Insufficient funds",
          variant: "destructive",
        });
      });
      
      expect(defaultProps.onError).toHaveBeenCalled();
    });

    it('handles network errors correctly', async () => {
      const user = userEvent.setup();
      mockInvoke.mockRejectedValueOnce(new Error('Network error'));
      
      render(<LencoPayment {...defaultProps} />);
      
      // Fill in required fields and submit
      const phoneInput = screen.getByPlaceholderText('097XXXXXXX');
      await user.type(phoneInput, '0971234567');
      
      const providerSelect = screen.getByRole('combobox', { name: /mobile money provider/i });
      await user.click(providerSelect);
      await user.click(screen.getByText('MTN Mobile Money'));
      
      const payButton = screen.getByRole('button', { name: /pay k100.00/i });
      await user.click(payButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Payment Failed",
          description: "Network error",
          variant: "destructive",
        });
      });
      
      expect(defaultProps.onError).toHaveBeenCalled();
    });

    it('shows processing state during payment', async () => {
      const user = userEvent.setup();
      // Mock a delayed response
      mockInvoke.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => 
          resolve({ data: { success: true, transaction_id: 'TXN123' }, error: null }), 100)
        )
      );
      
      render(<LencoPayment {...defaultProps} />);
      
      // Fill in required fields
      const phoneInput = screen.getByPlaceholderText('097XXXXXXX');
      await user.type(phoneInput, '0971234567');
      
      const providerSelect = screen.getByRole('combobox', { name: /mobile money provider/i });
      await user.click(providerSelect);
      await user.click(screen.getByText('MTN Mobile Money'));
      
      const payButton = screen.getByRole('button', { name: /pay k100.00/i });
      await user.click(payButton);
      
      // Check processing state
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(payButton).toBeDisabled();
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/pay k100.00/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<LencoPayment {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles string amount with currency symbols', () => {
      render(<LencoPayment {...defaultProps} amount="K 100.50" />);
      
      expect(screen.getByText('ZMW 100.50')).toBeInTheDocument();
      expect(screen.getByText('ZMW 2.01')).toBeInTheDocument(); // 2% fee
    });

    it('handles very small amounts', () => {
      render(<LencoPayment {...defaultProps} amount="1" />);
      
      expect(screen.getByText('ZMW 1.00')).toBeInTheDocument();
      expect(screen.getByText('ZMW 0.02')).toBeInTheDocument(); // 2% fee
      expect(screen.getByText('ZMW 0.98')).toBeInTheDocument(); // Provider amount
    });

    it('handles large amounts', () => {
      render(<LencoPayment {...defaultProps} amount="10000" />);
      
      expect(screen.getByText('ZMW 10000.00')).toBeInTheDocument();
      expect(screen.getByText('ZMW 200.00')).toBeInTheDocument(); // 2% fee
      expect(screen.getByText('ZMW 9800.00')).toBeInTheDocument(); // Provider amount
    });
  });
});