-- Drop existing trigger and function to recreate properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user creation with email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile with email from auth user and full_name from metadata
  INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();
  
  -- Assign default user role (avoid duplicate)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create needs_assessments table for storing business needs assessments
CREATE TABLE IF NOT EXISTS public.needs_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL, -- 'funding', 'gap', 'risk', 'growth'
  business_type TEXT,
  sector TEXT,
  location TEXT,
  funding_amount NUMERIC,
  funding_purpose TEXT,
  funding_timeline TEXT,
  gaps_identified TEXT[],
  recommendations JSONB DEFAULT '[]'::jsonb,
  ai_analysis JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on needs_assessments
ALTER TABLE public.needs_assessments ENABLE ROW LEVEL SECURITY;

-- RLS policies for needs_assessments
CREATE POLICY "Users can view their own assessments" 
ON public.needs_assessments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assessments" 
ON public.needs_assessments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assessments" 
ON public.needs_assessments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create notification_logs table for tracking sent notifications
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'order', 'message', 'funding'
  title TEXT NOT NULL,
  message TEXT,
  email_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  related_id UUID, -- Reference to order/message/opportunity ID
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_logs
CREATE POLICY "Users can view their own notifications" 
ON public.notification_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Trigger for updated_at on needs_assessments
CREATE TRIGGER update_needs_assessments_updated_at
BEFORE UPDATE ON public.needs_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();