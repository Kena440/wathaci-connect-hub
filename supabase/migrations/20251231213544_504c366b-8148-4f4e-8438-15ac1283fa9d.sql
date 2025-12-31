-- ============================================
-- COMPLETE DATABASE SCHEMA FOR NEGOTIATION, MARKETPLACE, PARTNERSHIP, AND FUNDING SYSTEMS
-- ============================================

-- ============================================
-- 1. SERVICES TABLE - Core marketplace services
-- ============================================
CREATE TABLE public.services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'ZMW',
    price_type TEXT DEFAULT 'fixed', -- fixed, hourly, negotiable
    min_price NUMERIC,
    max_price NUMERIC,
    delivery_time TEXT,
    location TEXT,
    skills TEXT[] DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    rating NUMERIC DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    provider_type TEXT DEFAULT 'freelancer', -- freelancer, partnership, resource
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Services RLS policies
CREATE POLICY "Anyone can view active services" 
ON public.services FOR SELECT 
USING (is_active = true);

CREATE POLICY "Service providers can insert their own services" 
ON public.services FOR INSERT 
WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Service providers can update their own services" 
ON public.services FOR UPDATE 
USING (auth.uid() = provider_id);

CREATE POLICY "Service providers can delete their own services" 
ON public.services FOR DELETE 
USING (auth.uid() = provider_id);

-- ============================================
-- 2. NEGOTIATIONS TABLE - Price negotiations between SMEs and Professionals
-- ============================================
CREATE TABLE public.negotiations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    client_id UUID NOT NULL,
    service_title TEXT NOT NULL,
    initial_price NUMERIC NOT NULL,
    current_price NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, countered, accepted, rejected, expired
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    final_price NUMERIC,
    platform_fee NUMERIC,
    notes TEXT
);

-- Enable RLS on negotiations
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;

-- Negotiations RLS policies
CREATE POLICY "Users can view their own negotiations" 
ON public.negotiations FOR SELECT 
USING (auth.uid() = provider_id OR auth.uid() = client_id);

CREATE POLICY "Clients can create negotiations" 
ON public.negotiations FOR INSERT 
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Participants can update negotiations" 
ON public.negotiations FOR UPDATE 
USING (auth.uid() = provider_id OR auth.uid() = client_id);

-- ============================================
-- 3. NEGOTIATION_MESSAGES TABLE - Chat/messages in negotiations
-- ============================================
CREATE TABLE public.negotiation_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    negotiation_id UUID NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    message TEXT NOT NULL,
    proposed_price NUMERIC,
    message_type TEXT DEFAULT 'message', -- message, counter_offer, acceptance, rejection
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on negotiation_messages
ALTER TABLE public.negotiation_messages ENABLE ROW LEVEL SECURITY;

-- Negotiation messages RLS policies
CREATE POLICY "Participants can view negotiation messages" 
ON public.negotiation_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.negotiations n 
        WHERE n.id = negotiation_id 
        AND (n.provider_id = auth.uid() OR n.client_id = auth.uid())
    )
);

CREATE POLICY "Participants can send messages" 
ON public.negotiation_messages FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.negotiations n 
        WHERE n.id = negotiation_id 
        AND (n.provider_id = auth.uid() OR n.client_id = auth.uid())
    )
);

-- ============================================
-- 4. ORDERS TABLE - Service orders after negotiation
-- ============================================
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    negotiation_id UUID REFERENCES public.negotiations(id) ON DELETE SET NULL,
    client_id UUID NOT NULL,
    provider_id UUID NOT NULL,
    service_title TEXT NOT NULL,
    agreed_price NUMERIC NOT NULL,
    platform_fee NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZMW',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, in_progress, completed, cancelled, disputed
    payment_status TEXT DEFAULT 'pending', -- pending, paid, refunded
    delivery_deadline TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    client_rating INTEGER,
    client_review TEXT,
    provider_rating INTEGER,
    provider_review TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Orders RLS policies
CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = client_id OR auth.uid() = provider_id);

CREATE POLICY "Clients can create orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Participants can update orders" 
ON public.orders FOR UPDATE 
USING (auth.uid() = client_id OR auth.uid() = provider_id);

-- ============================================
-- 5. PARTNERSHIP_APPLICATIONS TABLE - Partner applications
-- ============================================
CREATE TABLE public.partnership_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    partnership_type TEXT NOT NULL,
    description TEXT,
    website TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewing, approved, rejected
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on partnership_applications
ALTER TABLE public.partnership_applications ENABLE ROW LEVEL SECURITY;

-- Partnership applications RLS policies
CREATE POLICY "Users can view their own applications" 
ON public.partnership_applications FOR SELECT 
USING (email = (SELECT email FROM public.profiles WHERE id = auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Anyone can submit applications" 
ON public.partnership_applications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update applications" 
ON public.partnership_applications FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 6. PARTNERS TABLE - Approved partners
-- ============================================
CREATE TABLE public.partners (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    application_id UUID REFERENCES public.partnership_applications(id),
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    partnership_type TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    commission_rate NUMERIC DEFAULT 10,
    total_referrals INTEGER DEFAULT 0,
    total_earnings NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Partners RLS policies
CREATE POLICY "Anyone can view active partners" 
ON public.partners FOR SELECT 
USING (is_active = true);

CREATE POLICY "Partners can update their own profile" 
ON public.partners FOR UPDATE 
USING (user_id = auth.uid());

-- ============================================
-- 7. REFERRALS TABLE - Partner referral tracking
-- ============================================
CREATE TABLE public.referrals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    referred_user_id UUID,
    referred_email TEXT,
    referral_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, registered, converted, paid
    conversion_amount NUMERIC,
    commission_amount NUMERIC,
    commission_paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Referrals RLS policies
CREATE POLICY "Partners can view their own referrals" 
ON public.referrals FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.partners p 
        WHERE p.id = partner_id 
        AND p.user_id = auth.uid()
    )
);

CREATE POLICY "System can insert referrals" 
ON public.referrals FOR INSERT 
WITH CHECK (true);

-- ============================================
-- 8. FUNDING_OPPORTUNITIES TABLE - Funding listings
-- ============================================
CREATE TABLE public.funding_opportunities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    organization TEXT NOT NULL,
    description TEXT,
    amount_min NUMERIC,
    amount_max NUMERIC,
    amount_display TEXT,
    currency TEXT DEFAULT 'USD',
    category TEXT NOT NULL,
    funding_type TEXT, -- grant, loan, equity, mixed
    deadline TIMESTAMP WITH TIME ZONE,
    location TEXT,
    eligibility_criteria TEXT[],
    required_documents TEXT[],
    application_url TEXT,
    contact_email TEXT,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    sectors TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on funding_opportunities
ALTER TABLE public.funding_opportunities ENABLE ROW LEVEL SECURITY;

-- Funding opportunities RLS policies
CREATE POLICY "Anyone can view active funding opportunities" 
ON public.funding_opportunities FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage funding opportunities" 
ON public.funding_opportunities FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 9. FUNDING_APPLICATIONS TABLE - User funding applications
-- ============================================
CREATE TABLE public.funding_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    opportunity_id UUID NOT NULL REFERENCES public.funding_opportunities(id) ON DELETE CASCADE,
    business_name TEXT,
    business_description TEXT,
    funding_amount_requested NUMERIC,
    funding_purpose TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, under_review, approved, rejected
    ai_match_score NUMERIC,
    ai_analysis JSONB,
    documents JSONB DEFAULT '[]',
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on funding_applications
ALTER TABLE public.funding_applications ENABLE ROW LEVEL SECURITY;

-- Funding applications RLS policies
CREATE POLICY "Users can view their own funding applications" 
ON public.funding_applications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create funding applications" 
ON public.funding_applications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications" 
ON public.funding_applications FOR UPDATE 
USING (auth.uid() = user_id);

-- ============================================
-- 10. SERVICE_REVIEWS TABLE - Reviews for services
-- ============================================
CREATE TABLE public.service_reviews (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    reviewer_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    response TEXT,
    response_at TIMESTAMP WITH TIME ZONE,
    is_verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on service_reviews
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

-- Service reviews RLS policies
CREATE POLICY "Anyone can view reviews" 
ON public.service_reviews FOR SELECT 
USING (true);

CREATE POLICY "Users can create reviews" 
ON public.service_reviews FOR INSERT 
WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can update their own reviews" 
ON public.service_reviews FOR UPDATE 
USING (auth.uid() = reviewer_id);

-- ============================================
-- 11. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_services_provider ON public.services(provider_id);
CREATE INDEX idx_services_category ON public.services(category);
CREATE INDEX idx_services_active ON public.services(is_active);
CREATE INDEX idx_services_provider_type ON public.services(provider_type);

CREATE INDEX idx_negotiations_provider ON public.negotiations(provider_id);
CREATE INDEX idx_negotiations_client ON public.negotiations(client_id);
CREATE INDEX idx_negotiations_status ON public.negotiations(status);
CREATE INDEX idx_negotiations_service ON public.negotiations(service_id);

CREATE INDEX idx_negotiation_messages_negotiation ON public.negotiation_messages(negotiation_id);
CREATE INDEX idx_negotiation_messages_sender ON public.negotiation_messages(sender_id);

CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_provider ON public.orders(provider_id);
CREATE INDEX idx_orders_status ON public.orders(status);

CREATE INDEX idx_partnership_applications_status ON public.partnership_applications(status);
CREATE INDEX idx_partnership_applications_email ON public.partnership_applications(email);

CREATE INDEX idx_partners_type ON public.partners(partnership_type);
CREATE INDEX idx_partners_active ON public.partners(is_active);

CREATE INDEX idx_referrals_partner ON public.referrals(partner_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);

CREATE INDEX idx_funding_opportunities_category ON public.funding_opportunities(category);
CREATE INDEX idx_funding_opportunities_active ON public.funding_opportunities(is_active);
CREATE INDEX idx_funding_opportunities_deadline ON public.funding_opportunities(deadline);

CREATE INDEX idx_funding_applications_user ON public.funding_applications(user_id);
CREATE INDEX idx_funding_applications_opportunity ON public.funding_applications(opportunity_id);
CREATE INDEX idx_funding_applications_status ON public.funding_applications(status);

CREATE INDEX idx_service_reviews_service ON public.service_reviews(service_id);
CREATE INDEX idx_service_reviews_reviewer ON public.service_reviews(reviewer_id);

-- ============================================
-- 12. TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_negotiations_updated_at
    BEFORE UPDATE ON public.negotiations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partnership_applications_updated_at
    BEFORE UPDATE ON public.partnership_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
    BEFORE UPDATE ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funding_opportunities_updated_at
    BEFORE UPDATE ON public.funding_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funding_applications_updated_at
    BEFORE UPDATE ON public.funding_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_reviews_updated_at
    BEFORE UPDATE ON public.service_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 13. ENABLE REALTIME FOR KEY TABLES
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;