-- Create sme_readiness_scores table
CREATE TABLE IF NOT EXISTS public.sme_readiness_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sme_readiness_scores_updated_at
  BEFORE UPDATE ON public.sme_readiness_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.sme_readiness_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can insert only their own records
CREATE POLICY "Users can insert their own readiness scores"
  ON public.sme_readiness_scores
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can select only their own records
CREATE POLICY "Users can view their own readiness scores"
  ON public.sme_readiness_scores
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can update only their own records
CREATE POLICY "Users can update their own readiness scores"
  ON public.sme_readiness_scores
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_sme_readiness_scores_user_id ON public.sme_readiness_scores(user_id);

-- Add comment for documentation
COMMENT ON TABLE public.sme_readiness_scores IS 'Stores SME readiness assessment scores and answers';
