import { apiPost } from './client';

export interface SupportTicketResponse {
  ok: boolean;
  ticket?: {
    id: string;
    category?: string | null;
    status?: string;
    slaDueAt?: string | null;
  };
  message?: string;
  error?: string;
}

interface SubmitCisoQuestionPayload {
  email: string;
  message: string;
  subject?: string;
  category?: string;
  userId?: string;
}

export const submitCisoQuestion = async (
  payload: SubmitCisoQuestionPayload,
): Promise<SupportTicketResponse> => {
  const { email, message, subject, category, userId } = payload;

  return apiPost<SupportTicketResponse>('/api/support/contact', {
    email,
    subject: subject ?? '@Ask Ciso for help',
    message,
    category: category ?? 'ciso',
    userId,
  });
};
