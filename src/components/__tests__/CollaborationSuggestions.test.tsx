import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CollaborationSuggestions } from '../CollaborationSuggestions';

const mockGetSuggestions = vi.fn();
vi.mock('@/lib/services/collaboration-service', () => ({
  getCollaborationSuggestions: (profile: any) => mockGetSuggestions(profile),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('CollaborationSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders suggestions on success', async () => {
    mockGetSuggestions.mockResolvedValue([
      {
        id: '1',
        type: 'partnership',
        title: 'Partner up',
        description: 'desc',
        matchScore: 80,
        participants: ['Alice'],
        tags: ['innovation'],
        potentialValue: '$100',
      },
    ]);

    render(<CollaborationSuggestions userProfile={{}} />);

    expect(await screen.findByText('Partner up')).toBeInTheDocument();
  });

  it('handles failure and shows toast', async () => {
    mockGetSuggestions.mockRejectedValue(new Error('fail'));

    render(<CollaborationSuggestions userProfile={{}} />);

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(screen.getByText('No suggestions available')).toBeInTheDocument();
  });
});
