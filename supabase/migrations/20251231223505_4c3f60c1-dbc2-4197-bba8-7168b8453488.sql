-- Create donations table to track all donations
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'ZMW',
  donor_name VARCHAR(255),
  donor_email VARCHAR(255),
  message TEXT,
  payment_method VARCHAR(50),
  payment_provider VARCHAR(50),
  payment_reference VARCHAR(100),
  phone_number VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert donations (for anonymous donors)
CREATE POLICY "Anyone can create donations"
  ON public.donations
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own donations
CREATE POLICY "Users can view their own donations"
  ON public.donations
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();