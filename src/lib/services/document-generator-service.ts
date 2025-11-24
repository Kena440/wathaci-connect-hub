import { apiGet, apiPost } from '@/lib/api/client';

export type DocumentType = 'business_plan' | 'pitch_deck' | 'bundle';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type GenerationStatus = 'not_started' | 'processing' | 'completed' | 'failed';

export interface PaidDocumentRequest {
  id: string;
  user_id: string;
  company_id: string;
  document_type: DocumentType;
  input_data: Record<string, unknown>;
  payment_status: PaymentStatus;
  amount: number;
  currency: string;
  payment_reference?: string;
  payment_gateway?: string;
  generation_status: GenerationStatus;
  output_files?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentResponse {
  request: PaidDocumentRequest;
  payment: {
    status: PaymentStatus;
    reference?: string;
    requires_confirmation: boolean;
    message: string;
  };
}

export const documentGeneratorService = {
  async getConfig() {
    return apiGet<{ supported_documents: DocumentType[]; pricing: Record<string, number | string> }>('/api/documents/config');
  },

  async initiatePayment(params: {
    document_type: DocumentType;
    payment_method: string;
    user_id: string;
    company_id?: string;
    input_data: Record<string, unknown>;
    currency?: string;
    auto_confirm?: boolean;
  }): Promise<PaymentResponse> {
    return apiPost<PaymentResponse>('/api/documents/pay', params);
  },

  async confirmPayment(id: string, status: PaymentStatus = 'success') {
    return apiPost<{ request: PaidDocumentRequest }>(`/api/documents/${id}/confirm-payment`, { status });
  },

  async generateDocument(id: string, user_id: string) {
    return apiPost<{ request: PaidDocumentRequest }>(`/api/documents/${id}/generate`, { user_id });
  },

  async getRequest(id: string, user_id: string) {
    return apiGet<{ request: PaidDocumentRequest }>(`/api/documents/${id}?user_id=${encodeURIComponent(user_id)}`);
  },

  async listRequests(user_id: string) {
    return apiGet<{ requests: PaidDocumentRequest[] }>(`/api/documents?user_id=${encodeURIComponent(user_id)}`);
  },
};
