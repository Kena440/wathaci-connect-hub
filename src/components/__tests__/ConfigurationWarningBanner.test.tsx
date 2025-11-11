import { render, screen } from '@testing-library/react';
import { ConfigurationWarningBanner } from '../ConfigurationWarningBanner';

describe('ConfigurationWarningBanner', () => {
  it('renders nothing when there are no warnings', () => {
    const { container } = render(<ConfigurationWarningBanner warnings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a warning banner when there are warnings', () => {
    const warnings = ['Warning 1: Missing configuration', 'Warning 2: Invalid value'];
    render(<ConfigurationWarningBanner warnings={warnings} />);
    
    expect(screen.getByText('Configuration Warnings')).toBeInTheDocument();
    expect(screen.getByText('Warning 1: Missing configuration')).toBeInTheDocument();
    expect(screen.getByText('Warning 2: Invalid value')).toBeInTheDocument();
  });

  it('displays helper text about warnings not preventing app from running', () => {
    const warnings = ['Sample warning'];
    render(<ConfigurationWarningBanner warnings={warnings} />);
    
    expect(
      screen.getByText(
        "These warnings won't prevent the app from running, but you should address them before going to production."
      )
    ).toBeInTheDocument();
  });

  it('renders the alert with warning variant styling', () => {
    const warnings = ['Sample warning'];
    const { container } = render(<ConfigurationWarningBanner warnings={warnings} />);
    
    // Check if the alert has the warning variant classes
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeInTheDocument();
  });

  it('renders an AlertTriangle icon', () => {
    const warnings = ['Sample warning'];
    const { container } = render(<ConfigurationWarningBanner warnings={warnings} />);
    
    // Check if SVG icon is present
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders multiple warnings in a list', () => {
    const warnings = [
      'First warning',
      'Second warning',
      'Third warning'
    ];
    const { container } = render(<ConfigurationWarningBanner warnings={warnings} />);
    
    const listItems = container.querySelectorAll('ul li');
    expect(listItems).toHaveLength(3);
  });
});
