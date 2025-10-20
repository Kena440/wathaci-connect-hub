import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ServiceCard } from '../ServiceCard';

// Mock the PaymentWithNegotiation component
jest.mock('../PaymentWithNegotiation', () => ({
  PaymentWithNegotiation: ({ initialPrice, serviceTitle, providerId }: any) => (
    <div data-testid="payment-with-negotiation">
      <span>Payment for {serviceTitle} - K{initialPrice}</span>
      <button>Pay Now</button>
    </div>
  ),
}));

describe('ServiceCard Accessibility Tests', () => {
  const defaultProps = {
    title: 'Test Service',
    description: 'This is a test service description',
    image: 'https://example.com/test-image.jpg',
    color: 'bg-blue-100',
    details: 'Detailed information about the test service',
    price: 500,
    providerId: 'test-provider'
  };

  test('should not have accessibility violations in default state', async () => {
    const { container } = render(<ServiceCard {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('should not have accessibility violations when details are expanded', async () => {
    const { container } = render(<ServiceCard {...defaultProps} />);
    
    // Expand details
    const learnMoreButton = screen.getByRole('button', { name: /learn more/i });
    fireEvent.click(learnMoreButton);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('should have proper alt text for service image', () => {
    render(<ServiceCard {...defaultProps} />);
    
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt', defaultProps.title);
  });

  test('toggle button should have proper aria attributes', () => {
    render(<ServiceCard {...defaultProps} />);
    
    const learnMoreButton = screen.getByRole('button', { name: /learn more/i });
    expect(learnMoreButton).toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(learnMoreButton);
    
    const showLessButton = screen.getByRole('button', { name: /show less/i });
    expect(showLessButton).toBeInTheDocument();
  });

  test('price information should be accessible', () => {
    render(<ServiceCard {...defaultProps} />);
    
    // Check that price is displayed with proper structure
    expect(screen.getByText(`K${defaultProps.price}`)).toBeInTheDocument();
    expect(screen.getByText('starting from')).toBeInTheDocument();
  });

  test('card should have proper heading structure', () => {
    render(<ServiceCard {...defaultProps} />);
    
    // Service title should be a heading
    const heading = screen.getByRole('heading', { name: defaultProps.title });
    expect(heading).toBeInTheDocument();
  });

  test('should handle missing image gracefully', async () => {
    const propsWithBadImage = {
      ...defaultProps,
      image: '',
    };
    
    const { container } = render(<ServiceCard {...propsWithBadImage} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});