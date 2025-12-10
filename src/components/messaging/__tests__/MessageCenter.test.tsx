import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MessageCenter } from '../MessageCenter';

jest.mock('@/lib/supabase-enhanced', () => {
  return {
    supabase: {
      auth: {
        getUser: jest.fn(),
      },
      functions: {
        invoke: jest.fn(),
      },
    },
  };
});

import { supabaseClient } from '@/lib/supabaseClient';
jest.mock('@/lib/services', () => ({
  userService: {
    searchUsers: jest.fn(),
  },
}));
import { userService } from '@/lib/services';

describe('MessageCenter', () => {
  const mockMessages = [
    {
      id: '1',
      subject: 'Hello',
      content: 'Hi there',
      read: false,
      created_at: '2024-01-01T00:00:00Z',
      sender: { id: 's1', full_name: 'Alice' },
      recipient: { id: 'u1', full_name: 'Bob' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'u1' } } });
    (supabase.functions.invoke as any).mockImplementation((functionName, { body }) => {
      if (body.action === 'get_messages') {
        return Promise.resolve({ data: { messages: mockMessages }, error: null });
      }
      if (body.action === 'send_message') {
        return Promise.resolve({ data: {}, error: null });
      }
      if (body.action === 'mark_as_read') {
        return Promise.resolve({ data: {}, error: null });
      }
      return Promise.resolve({ data: {}, error: null });
    });
    (userService.searchUsers as any).mockResolvedValue({
      data: [{ id: 'u2', full_name: 'Charlie' }],
      error: null,
    });
  });

  it('renders messages, sends new message, and resets form', async () => {
    render(<MessageCenter />);

    // Messages render
    expect(await screen.findByText('Hello')).toBeInTheDocument();

    // Compose message
    fireEvent.click(screen.getByRole('button', { name: /compose/i }));
    fireEvent.change(screen.getByPlaceholderText('Search users...'), { target: { value: 'Cha' } });
    await waitFor(() => {
      expect(userService.searchUsers).toHaveBeenCalledWith('Cha');
    });
    fireEvent.click(await screen.findByText('Charlie'));
    expect(screen.getByPlaceholderText('Search users...')).toHaveValue('Charlie');
    fireEvent.change(screen.getByPlaceholderText('Subject'), { target: { value: 'New Subject' } });
    fireEvent.change(screen.getByPlaceholderText('Message content...'), { target: { value: 'New Content' } });

    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'messaging-system',
        expect.objectContaining({
          body: expect.objectContaining({
            action: 'send_message',
            sender_id: 'u1',
            recipient_id: 'u2',
            subject: 'New Subject',
            content: 'New Content',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryByText(/compose message/i)).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /compose/i }));
    expect(screen.getByPlaceholderText('Search users...')).toHaveValue('');
    expect(screen.getByPlaceholderText('Subject')).toHaveValue('');
    expect(screen.getByPlaceholderText('Message content...')).toHaveValue('');
  });

  it('marks unread messages as read when selected', async () => {
    render(<MessageCenter />);

    // Wait for messages to load
    const messageElement = await screen.findByText('Hello');
    expect(messageElement).toBeInTheDocument();

    // Verify unread badge is present
    expect(screen.getByText('New')).toBeInTheDocument();

    // Click on the unread message
    fireEvent.click(messageElement.closest('[data-testid], div[class*="cursor-pointer"]') || messageElement.parentElement!);

    // Verify mark as read was called
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'messaging-system',
        expect.objectContaining({
          body: expect.objectContaining({
            action: 'mark_as_read',
            message_id: '1',
            user_id: 'u1',
          }),
        })
      );
    });
  });
});

