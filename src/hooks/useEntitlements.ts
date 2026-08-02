import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Entitlements {
  hasFullAccess: boolean;
  isAdmin: boolean;
  inGracePeriod: boolean;
  gracePeriodEnd: string;
  subscription: {
    id: string;
    status: string;
    planName: string;
    currentPeriodEnd: string;
    features: string[];
    environment?: string;
    productId?: string;
    priceId?: string;
    cancelAtPeriodEnd?: boolean;
  } | null;
  limits: {
    fundingMatchesPerMonth: number;
    contactRequestsPerWeek: number;
    aiAnalysisEnabled: boolean;
    documentUploadsEnabled: boolean;
    premiumAnalytics: boolean;
  };
}

const defaultLimits = {
  fundingMatchesPerMonth: 3,
  contactRequestsPerWeek: 5,
  aiAnalysisEnabled: false,
  documentUploadsEnabled: false,
  premiumAnalytics: false,
};

const unlimitedLimits = {
  fundingMatchesPerMonth: -1,
  contactRequestsPerWeek: -1,
  aiAnalysisEnabled: true,
  documentUploadsEnabled: true,
  premiumAnalytics: true,
};

// Time-boxed promotion: August 2026 is free for everyone (UTC).
// Expires automatically on 2026-09-01; mirrors public.is_promo_free_period() in the DB.
const PROMO_FREE_START = Date.UTC(2026, 7, 1, 0, 0, 0);
const PROMO_FREE_END = Date.UTC(2026, 8, 1, 0, 0, 0);
const isPromoFreePeriod = () => {
  const now = Date.now();
  return now >= PROMO_FREE_START && now < PROMO_FREE_END;
};

export const useEntitlements = () => {
  const { user, isAdmin } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlements = useCallback(async () => {
    if (!user) {
      setEntitlements(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call the RPC function to get entitlements
      const { data, error: rpcError } = await supabase
        .rpc('get_user_entitlements', { p_user_id: user.id });

      if (rpcError || !data) {
        console.error('Error fetching entitlements:', rpcError);
        // Fallback: check grace period / promo window client-side
        const gracePeriodEnd = new Date('2026-01-20T00:00:00+02:00');
        const inGracePeriod = new Date() < gracePeriodEnd;
        const promoFree = isPromoFreePeriod();

        setEntitlements({
          hasFullAccess: promoFree || isAdmin || inGracePeriod,
          isAdmin: isAdmin,
          inGracePeriod: inGracePeriod,
          gracePeriodEnd: gracePeriodEnd.toISOString(),
          subscription: null,
          limits: promoFree || isAdmin || inGracePeriod ? unlimitedLimits : defaultLimits,
        });
        return;
      }

      // Cast data to expected shape
      const entData = data as {
        has_full_access: boolean;
        is_admin: boolean;
        in_grace_period: boolean;
        grace_period_end: string;
        subscription: { id: string; status: string; plan_name: string; current_period_end: string; features: string[] } | null;
        limits: { funding_matches_per_month: number; contact_requests_per_week: number; ai_analysis_enabled: boolean; document_uploads_enabled: boolean; premium_analytics: boolean };
      };

      // Transform the response
      const result: Entitlements = {
        hasFullAccess: entData.has_full_access,
        isAdmin: entData.is_admin,
        inGracePeriod: entData.in_grace_period,
        gracePeriodEnd: entData.grace_period_end,
        subscription: entData.subscription ? {
          id: entData.subscription.id,
          status: entData.subscription.status,
          planName: entData.subscription.plan_name,
          currentPeriodEnd: entData.subscription.current_period_end,
          features: entData.subscription.features || [],
          environment: (entData.subscription as any).environment,
          productId: (entData.subscription as any).product_id,
          priceId: (entData.subscription as any).price_id,
          cancelAtPeriodEnd: (entData.subscription as any).cancel_at_period_end,
        } : null,
        limits: {
          fundingMatchesPerMonth: entData.limits.funding_matches_per_month,
          contactRequestsPerWeek: entData.limits.contact_requests_per_week,
          aiAnalysisEnabled: entData.limits.ai_analysis_enabled,
          documentUploadsEnabled: entData.limits.document_uploads_enabled,
          premiumAnalytics: entData.limits.premium_analytics,
        },
      };

      setEntitlements(result);
    } catch (err) {
      console.error('Failed to fetch entitlements:', err);
      setError('Failed to load access information');
      
      // Fallback with grace period / promo window check
      const gracePeriodEnd = new Date('2026-01-20T00:00:00+02:00');
      const inGracePeriod = new Date() < gracePeriodEnd;
      const promoFree = isPromoFreePeriod();

      setEntitlements({
        hasFullAccess: promoFree || isAdmin || inGracePeriod,
        isAdmin: isAdmin,
        inGracePeriod: inGracePeriod,
        gracePeriodEnd: gracePeriodEnd.toISOString(),
        subscription: null,
        limits: promoFree || isAdmin || inGracePeriod ? unlimitedLimits : defaultLimits,
      });
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchEntitlements();
  }, [fetchEntitlements]);

  const refresh = useCallback(() => {
    fetchEntitlements();
  }, [fetchEntitlements]);

  // Helper functions
  const canUseFeature = useCallback((feature: keyof Entitlements['limits']): boolean => {
    if (!entitlements) return false;
    if (entitlements.hasFullAccess) return true;
    
    const limit = entitlements.limits[feature];
    if (typeof limit === 'boolean') return limit;
    return limit !== 0;
  }, [entitlements]);

  const getRemainingLimit = useCallback((feature: 'fundingMatchesPerMonth' | 'contactRequestsPerWeek'): number => {
    if (!entitlements) return 0;
    if (entitlements.hasFullAccess) return -1; // unlimited
    return entitlements.limits[feature];
  }, [entitlements]);

  return {
    entitlements,
    loading,
    error,
    refresh,
    canUseFeature,
    getRemainingLimit,
    // Convenience flags
    hasFullAccess: entitlements?.hasFullAccess ?? false,
    isAdmin: entitlements?.isAdmin ?? false,
    inGracePeriod: entitlements?.inGracePeriod ?? false,
    gracePeriodEnd: entitlements?.gracePeriodEnd ?? null,
    subscription: entitlements?.subscription ?? null,
    limits: entitlements?.limits ?? defaultLimits,
  };
};

export default useEntitlements;
