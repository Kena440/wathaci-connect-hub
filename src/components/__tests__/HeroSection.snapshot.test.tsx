import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import HeroSection from '../HeroSection';

describe('HeroSection', () => {
  it('matches snapshot', () => {
    const { container } = render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>
    );
    expect(container).toMatchSnapshot();
  });
});
