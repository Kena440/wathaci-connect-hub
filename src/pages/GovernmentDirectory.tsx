import { Helmet } from 'react-helmet-async';
import AppLayout from '@/components/AppLayout';
import PageHero from '@/components/PageHero';
import { DirectoryFilters } from '@/components/directory/DirectoryFilters';
import { DirectoryGrid } from '@/components/directory/DirectoryGrid';
import { useDirectoryProfiles } from '@/hooks/useDirectoryProfiles';
import { DonateButton } from '@/components/DonateButton';
import { Landmark } from 'lucide-react';
import heroResources from '@/assets/hero-resources.jpg';

export default function GovernmentDirectory() {
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
  } = useDirectoryProfiles({ accountType: 'government', pageSize: 20 });

  return (
    <AppLayout>
      <Helmet>
        <title>Government Institutions Directory | Wathaci Connect</title>
        <meta name="description" content="Connect with government agencies and public institutions supporting business development in Zambia." />
      </Helmet>

      <PageHero
        title="Government Directory"
        description="Connect with government agencies and institutions supporting business growth"
        backgroundImage={heroResources}
      >
        <DonateButton />
      </PageHero>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Browse Government Institutions</h2>
              <p className="text-muted-foreground">
                {totalCount} institution{totalCount !== 1 ? 's' : ''} registered
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
            emptyMessage="No government institutions found"
            emptyDescription="Government agencies, register to connect with businesses and professionals!"
          />
        </div>
      </div>
    </AppLayout>
  );
}
