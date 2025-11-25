-- Paid document requests table for monetized AI generators
-- This is a placeholder migration - the complete table is created in later migrations
-- with proper constraints, RLS policies, and foreign keys

-- Skip table creation if it exists - the comprehensive version is in 20251201110000
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'paid_document_requests') THEN
        CREATE TABLE public.paid_document_requests (
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
    END IF;
END $$;
