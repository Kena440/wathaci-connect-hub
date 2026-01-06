import { Helmet } from 'react-helmet-async';
import AppLayout from '@/components/AppLayout';
import PageHero from '@/components/PageHero';
import { DirectoryFilters } from '@/components/directory/DirectoryFilters';
import { DirectoryGrid } from '@/components/directory/DirectoryGrid';
import { useDirectoryProfiles } from '@/hooks/useDirectoryProfiles';
import { DonateButton } from '@/components/DonateButton';
import { TrendingUp } from 'lucide-react';
import heroFunding from '@/assets/hero-funding.jpg';

export default function InvestorsDirectory() {
  const {
    profiles,
    totalCount,
    isLoading,
    searchTerm,
    setSearchTerm,
    locationFilter,
    setLocationFilter,
    clearFilters,
    page,
    setPage,
    pageSize,
  } = useDirectoryProfiles({ accountType: 'investor', pageSize: 20 });

  return (
    <AppLayout>
      <Helmet>
        <title>Investors Directory | Wathaci Connect</title>
        <meta name="description" content="Connect with investors, VCs, and funding organizations across Zambia and beyond." />
      </Helmet>

      <PageHero
        title="Investors Directory"
        description="Connect with investors actively seeking opportunities in Zambian businesses"
        backgroundImage={heroFunding}
      >
        <DonateButton />
      </PageHero>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Browse Investors</h2>
              <p className="text-muted-foreground">
                {totalCount} investor{totalCount !== 1 ? 's' : ''} on the platform
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
            onClearFilters={clearFilters}
          />

          <DirectoryGrid
            profiles={profiles}
            isLoading={isLoading}
            page={page}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
            emptyMessage="No investors found"
            emptyDescription="Investors, join the platform to connect with promising Zambian businesses!"
          />
        </div>
      </div>
    </AppLayout>
  );
}
