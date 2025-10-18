import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HeroSection from '../HeroSection';

describe('HeroSection', () => {
  it('matches snapshot', () => {
    const { container } = render(
      <BrowserRouter>
        <HeroSection />
      </BrowserRouter>
    );
    expect(container).toMatchSnapshot();
  });
});
