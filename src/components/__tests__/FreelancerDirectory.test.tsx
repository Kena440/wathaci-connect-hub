import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { FreelancerDirectory } from '../FreelancerDirectory';
import { supabase } from '@/lib/supabase';

type MockSelectItemProps = { value: string; children: ReactNode };
type MockSelectProps = { value: string; onValueChange: (value: string) => void; children: ReactNode };

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/components/ui/select', () => {
  const React = require('react');

  const SelectItem = ({ value, children }: MockSelectItemProps) => (
    <option value={value}>{children}</option>
  );

  const SelectContent = ({ children }: { children: ReactNode }) => <>{children}</>;

  const Select = ({ value, onValueChange, children }: MockSelectProps) => {
    const options: ReactElement<MockSelectItemProps>[] = [];

    React.Children.forEach(children, (child: ReactNode) => {
      if (!React.isValidElement(child)) return;

      const element = child as ReactElement<any>;

      if (element.type === SelectContent) {
        React.Children.forEach(element.props.children, (option: ReactNode) => {
          if (React.isValidElement(option)) {
            const optionElement = option as ReactElement<MockSelectItemProps>;

            if (optionElement.type === SelectItem) {
              options.push(optionElement);
            }
          }
        });
      } else if (element.type === SelectItem) {
        options.push(element as ReactElement<MockSelectItemProps>);
      }
    });

    return (
      <select value={value} onChange={(event) => onValueChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.props.value} value={option.props.value}>
            {option.props.children}
          </option>
        ))}
      </select>
    );
  };

  const SelectTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const SelectValue = () => null;

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectLabel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectSeparator: () => null,
    SelectScrollUpButton: () => null,
    SelectScrollDownButton: () => null,
  };
});

describe('FreelancerDirectory', () => {
  const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    mockedSupabase.from.mockReset();

    const freelancers = [
      {
        id: '1',
        name: 'Alice Designer',
        title: 'UI/UX Specialist',
        bio: 'Experienced designer',
        skills: ['Figma', 'Sketch'],
        hourly_rate: 40,
        currency: 'USD',
        location: 'Lusaka',
        country: 'Zambia',
        rating: 4.8,
        reviews_count: 24,
        profile_image_url: null,
        availability_status: 'available',
        years_experience: 5,
        category: 'design',
      },
      {
        id: '2',
        name: 'Bob Builder',
        title: 'Full Stack Developer',
        bio: 'Seasoned developer',
        skills: ['React', 'Node.js'],
        hourly_rate: 55,
        currency: 'USD',
        location: 'Ndola',
        country: 'Zambia',
        rating: 4.6,
        reviews_count: 18,
        profile_image_url: null,
        availability_status: 'available',
        years_experience: 7,
        category: 'tech',
      },
    ];

    const eqMock = jest.fn().mockResolvedValue({ data: freelancers, error: null });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockedSupabase.from.mockImplementation(() => ({ select: selectMock } as any));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('filters freelancers by selected category', async () => {
    const user = userEvent.setup();

    render(<FreelancerDirectory />);

    expect(await screen.findByText('Alice Designer')).toBeInTheDocument();
    expect(screen.getByText('Bob Builder')).toBeInTheDocument();

    const [categorySelect] = screen.getAllByRole('combobox');

    await user.selectOptions(categorySelect, 'design');

    await waitFor(() => {
      expect(screen.queryByText('Bob Builder')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Alice Designer')).toBeInTheDocument();
  });
});
