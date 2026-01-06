import { Helmet } from 'react-helmet-async';
import AppLayout from '@/components/AppLayout';
import PageHero from '@/components/PageHero';
import { DirectoryFilters } from '@/components/directory/DirectoryFilters';
import { DirectoryGrid } from '@/components/directory/DirectoryGrid';
import { useDirectoryProfiles } from '@/hooks/useDirectoryProfiles';
import { DonateButton } from '@/components/DonateButton';
import { Building2 } from 'lucide-react';
import heroMarketplace from '@/assets/hero-marketplace.jpg';

export default function SMEDirectory() {
  const {
    profiles,
    totalCount,
    isLoading,
    searchTerm,
    setSearchTerm,
    locationFilter,
    setLocationFilter,
    industryFilter,
    setIndustryFilter,
    clearFilters,
    page,
    setPage,
    pageSize,
  } = useDirectoryProfiles({ accountType: 'sme', pageSize: 20 });

  return (
    <AppLayout>
      <Helmet>
        <title>SMEs & Businesses Directory | Wathaci Connect</title>
        <meta name="description" content="Explore SMEs and businesses across Zambia. Find investment opportunities, partnerships, and collaboration." />
      </Helmet>

      <PageHero
        title="SMEs & Businesses"
        description="Discover growing businesses and investment opportunities across Zambia"
        backgroundImage={heroMarketplace}
      >
        <DonateButton />
      </PageHero>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Browse SMEs</h2>
              <p className="text-muted-foreground">
                {totalCount} business{totalCount !== 1 ? 'es' : ''} registered
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <DirectoryFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            locationFilter={locationFilter}
            onLocationChange={setLocationFilter}
            industryFilter={industryFilter}
            onIndustryChange={setIndustryFilter}
            showIndustryFilter
            onClearFilters={clearFilters}
          />

          <DirectoryGrid
            profiles={profiles}
            isLoading={isLoading}
            page={page}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
            emptyMessage="No SMEs found"
            emptyDescription="Be the first to register your business! Sign up and complete your profile to appear here."
          />
        </div>
      </div>
    </AppLayout>
  );
}
