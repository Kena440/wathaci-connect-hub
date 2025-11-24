-- Paid document requests table for monetized AI generators
CREATE TABLE IF NOT EXISTS public.paid_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  document_type TEXT NOT NULL,
  input_data JSONB NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  amount NUMERIC NOT NULL DEFAULT 150,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  payment_reference TEXT,
  payment_gateway TEXT,
  generation_status TEXT NOT NULL DEFAULT 'not_started',
  output_files JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paid_document_requests_user ON public.paid_document_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_paid_document_requests_status ON public.paid_document_requests (payment_status, generation_status);

COMMENT ON COLUMN public.paid_document_requests.payment_status IS 'pending | success | failed | refunded';
COMMENT ON COLUMN public.paid_document_requests.generation_status IS 'not_started | processing | completed | failed';
