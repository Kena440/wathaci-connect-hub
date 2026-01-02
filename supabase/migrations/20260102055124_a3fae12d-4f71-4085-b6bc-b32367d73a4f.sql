-- =====================================================
-- FIX 1: Create storage bucket with RLS policies
-- =====================================================

-- Create the profile-images bucket with private access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-images', 'profile-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

-- Storage RLS policies - Users can only access their own files
-- Files are stored in format: {user_id}/... or avatars/{filename}, profiles/{filename}
-- The folder structure determines ownership

CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND (
    -- Files in user ID folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Avatar/profile files (legacy support - anyone can upload to these, identified by unique name)
    (storage.foldername(name))[1] IN ('avatars', 'profiles')
  )
);

CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-images' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (storage.foldername(name))[1] IN ('avatars', 'profiles')
  )
);

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-images' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (storage.foldername(name))[1] IN ('avatars', 'profiles')
  )
);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-images' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (storage.foldername(name))[1] IN ('avatars', 'profiles')
  )
);

-- =====================================================
-- FIX 2: Create missing tables with proper RLS
-- =====================================================

-- Create due_diligence_documents table
CREATE TABLE IF NOT EXISTS public.due_diligence_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'business_registration', 'tax_clearance', 'professional_license',
    'insurance_certificate', 'bank_statement', 'identity_document', 'address_proof'
  )),
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on due_diligence_documents
ALTER TABLE public.due_diligence_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for due_diligence_documents
CREATE POLICY "Users can view their own documents"
  ON public.due_diligence_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON public.due_diligence_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.due_diligence_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all documents"
  ON public.due_diligence_documents FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all documents"
  ON public.due_diligence_documents FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create co_investments table
CREATE TABLE IF NOT EXISTS public.co_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sme_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  funding_goal DECIMAL(12,2) NOT NULL CHECK (funding_goal > 0),
  minimum_investment DECIMAL(12,2) NOT NULL DEFAULT 1000 CHECK (minimum_investment > 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'funded')),
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  participants_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on co_investments
ALTER TABLE public.co_investments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for co_investments
CREATE POLICY "Anyone can view open co-investments"
  ON public.co_investments FOR SELECT
  USING (status = 'open' OR auth.uid() = sme_id);

CREATE POLICY "SMEs can create their own co-investments"
  ON public.co_investments FOR INSERT
  WITH CHECK (auth.uid() = sme_id);

CREATE POLICY "SMEs can update their own co-investments"
  ON public.co_investments FOR UPDATE
  USING (auth.uid() = sme_id);

-- Create co_investment_participants table
CREATE TABLE IF NOT EXISTS public.co_investment_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  co_investment_id UUID NOT NULL REFERENCES public.co_investments(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL,
  amount_committed DECIMAL(12,2) NOT NULL CHECK (amount_committed > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(co_investment_id, investor_id)
);

-- Enable RLS on co_investment_participants
ALTER TABLE public.co_investment_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for co_investment_participants
CREATE POLICY "Participants can view their own participation"
  ON public.co_investment_participants FOR SELECT
  USING (
    auth.uid() = investor_id OR 
    auth.uid() IN (SELECT sme_id FROM co_investments WHERE id = co_investment_id)
  );

CREATE POLICY "Investors can participate"
  ON public.co_investment_participants FOR INSERT
  WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Investors can update their participation"
  ON public.co_investment_participants FOR UPDATE
  USING (auth.uid() = investor_id);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_due_diligence_documents_updated_at
  BEFORE UPDATE ON public.due_diligence_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_co_investments_updated_at
  BEFORE UPDATE ON public.co_investments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_due_diligence_documents_user_id ON public.due_diligence_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_due_diligence_documents_type ON public.due_diligence_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_co_investments_sme_id ON public.co_investments(sme_id);
CREATE INDEX IF NOT EXISTS idx_co_investments_status ON public.co_investments(status);
CREATE INDEX IF NOT EXISTS idx_co_investment_participants_investor_id ON public.co_investment_participants(investor_id);
CREATE INDEX IF NOT EXISTS idx_co_investment_participants_co_investment_id ON public.co_investment_participants(co_investment_id);