-- Migration: Create paid_document_requests table for AI Document Generator
-- This table stores all paid document generation requests (Business Plans & Pitch Decks)

CREATE TABLE IF NOT EXISTS paid_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('business_plan', 'pitch_deck')),
  input_data JSONB NOT NULL DEFAULT '{}',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded')),
  amount NUMERIC NOT NULL DEFAULT 150,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  payment_reference TEXT,
  payment_gateway TEXT CHECK (payment_gateway IN ('mobile_money', 'stripe', 'flutterwave', 'card', 'bank_transfer')),
  generation_status TEXT NOT NULL DEFAULT 'not_started' CHECK (generation_status IN ('not_started', 'queued', 'processing', 'completed', 'failed')),
  output_files JSONB DEFAULT NULL,
  receipt_url TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_paid_document_requests_user_id ON paid_document_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_paid_document_requests_company_id ON paid_document_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_paid_document_requests_payment_reference ON paid_document_requests(payment_reference);
CREATE INDEX IF NOT EXISTS idx_paid_document_requests_payment_status ON paid_document_requests(payment_status);
CREATE INDEX IF NOT EXISTS idx_paid_document_requests_document_type ON paid_document_requests(document_type);

-- Enable Row Level Security
ALTER TABLE paid_document_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own document requests
CREATE POLICY "Users can read own document requests"
  ON paid_document_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own document requests
CREATE POLICY "Users can insert own document requests"
  ON paid_document_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own document requests (for payment status)
CREATE POLICY "Users can update own document requests"
  ON paid_document_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_paid_document_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_paid_document_requests_updated_at ON paid_document_requests;
CREATE TRIGGER trigger_update_paid_document_requests_updated_at
  BEFORE UPDATE ON paid_document_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_paid_document_requests_updated_at();

-- Create table for storing document generation logs (for debugging and audit)
CREATE TABLE IF NOT EXISTS document_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_request_id uuid NOT NULL REFERENCES paid_document_requests(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL CHECK (log_type IN ('info', 'warning', 'error', 'success')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_generation_logs_request_id ON document_generation_logs(document_request_id);

-- RLS for document_generation_logs
ALTER TABLE document_generation_logs ENABLE ROW LEVEL SECURITY;

-- Users can read logs for their own documents
CREATE POLICY "Users can read own document logs"
  ON document_generation_logs
  FOR SELECT
  TO authenticated
  USING (
    document_request_id IN (
      SELECT id FROM paid_document_requests WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE paid_document_requests IS 'Stores all paid document generation requests for Business Plans and Pitch Decks';
COMMENT ON COLUMN paid_document_requests.document_type IS 'Type of document: business_plan or pitch_deck';
COMMENT ON COLUMN paid_document_requests.payment_status IS 'Payment status: pending, success, failed, refunded';
COMMENT ON COLUMN paid_document_requests.generation_status IS 'Generation status: not_started, queued, processing, completed, failed';
COMMENT ON COLUMN paid_document_requests.output_files IS 'JSON object containing URLs to generated files (pdf_url, docx_url, pptx_url)';
