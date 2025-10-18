import { render } from '@testing-library/react';
import HeroSection from '../HeroSection';

describe('HeroSection', () => {
  it('matches snapshot', () => {
    const { container } = render(<HeroSection />);
    expect(container).toMatchSnapshot();
  });
});
