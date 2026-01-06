import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AccountType = 'freelancer' | 'sme' | 'investor' | 'government';

export interface DirectoryProfile {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  profile_photo_url?: string | null;
  avatar_url?: string | null;
  account_type?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  // Freelancer
  professional_title?: string | null;
  primary_skills?: string[] | null;
  experience_level?: string | null;
  availability?: string | null;
  rate_range?: string | null;
  // SME
  business_name?: string | null;
  industry?: string | null;
  business_stage?: string | null;
  sme_services?: string | null;
  top_needs?: string[] | null;
  // Investor
  investor_type?: string | null;
  ticket_size_range?: string | null;
  investor_sectors?: string[] | null;
  investment_stage_focus?: string[] | null;
  // Government
  institution_name?: string | null;
  institution_type?: string | null;
  mandate_areas?: string[] | null;
  services_or_programmes?: string | null;
}

interface UseDirectoryProfilesOptions {
  accountType: AccountType;
  pageSize?: number;
}

export function useDirectoryProfiles({ accountType, pageSize = 20 }: UseDirectoryProfilesOptions) {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Debounced search (simple implementation)
  const debouncedSearch = useMemo(() => searchTerm, [searchTerm]);

  const queryKey = ['directory-profiles', accountType, debouncedSearch, locationFilter, industryFilter, page, pageSize];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build the query
      let query = supabase
        .from('v_public_profiles')
        .select('*', { count: 'exact' })
        .eq('account_type', accountType)
        .eq('is_profile_complete', true)
        .order('created_at', { ascending: false });

      // Apply search filter
      if (debouncedSearch) {
        const searchPattern = `%${debouncedSearch}%`;
        query = query.or(
          `display_name.ilike.${searchPattern},` +
          `bio.ilike.${searchPattern},` +
          `professional_title.ilike.${searchPattern},` +
          `business_name.ilike.${searchPattern},` +
          `institution_name.ilike.${searchPattern}`
        );
      }

      // Apply location filter
      if (locationFilter && locationFilter !== 'all') {
        query = query.ilike('city', `%${locationFilter}%`);
      }

      // Apply industry filter for SME and Investor
      if (industryFilter && industryFilter !== 'all') {
        if (accountType === 'sme') {
          query = query.ilike('industry', `%${industryFilter}%`);
        }
      }

      // Apply pagination
      query = query.range(from, to);

      const { data: profiles, error, count } = await query;

      if (error) throw error;

      // Filter out profiles without an id and map to DirectoryProfile
      const validProfiles: DirectoryProfile[] = (profiles || [])
        .filter((p): p is typeof p & { id: string } => p.id !== null)
        .map(p => ({
          id: p.id,
          display_name: p.display_name,
          profile_photo_url: p.profile_photo_url,
          account_type: p.account_type,
          bio: p.bio,
          city: p.city,
          country: p.country,
          professional_title: p.professional_title,
          primary_skills: p.primary_skills,
          experience_level: p.experience_level,
          availability: p.availability,
          rate_range: p.rate_range,
          business_name: p.business_name,
          industry: p.industry,
          business_stage: p.business_stage,
          sme_services: p.sme_services,
          top_needs: p.top_needs,
          investor_type: p.investor_type,
          ticket_size_range: p.ticket_size_range,
          investor_sectors: p.investor_sectors,
          investment_stage_focus: p.investment_stage_focus,
          institution_name: p.institution_name,
          institution_type: p.institution_type,
          mandate_areas: p.mandate_areas,
          services_or_programmes: p.services_or_programmes,
        }));

      return {
        profiles: validProfiles,
        totalCount: count || 0,
      };
    },
    staleTime: 30000, // 30 seconds
  });

  const clearFilters = () => {
    setSearchTerm('');
    setLocationFilter('all');
    setIndustryFilter('all');
    setPage(1);
  };

  return {
    profiles: data?.profiles || [],
    totalCount: data?.totalCount || 0,
    isLoading,
    error,
    // Filters
    searchTerm,
    setSearchTerm: (value: string) => {
      setSearchTerm(value);
      setPage(1); // Reset to first page on search
    },
    locationFilter,
    setLocationFilter: (value: string) => {
      setLocationFilter(value);
      setPage(1);
    },
    industryFilter,
    setIndustryFilter: (value: string) => {
      setIndustryFilter(value);
      setPage(1);
    },
    clearFilters,
    // Pagination
    page,
    setPage,
    pageSize,
    refetch,
  };
}
