import { Helmet } from 'react-helmet-async';
import AppLayout from '@/components/AppLayout';
import PageHero from '@/components/PageHero';
import { DirectoryFilters } from '@/components/directory/DirectoryFilters';
import { DirectoryGrid } from '@/components/directory/DirectoryGrid';
import { useDirectoryProfiles } from '@/hooks/useDirectoryProfiles';
import { DonateButton } from '@/components/DonateButton';
import { Briefcase } from 'lucide-react';
import heroFreelancer from '@/assets/hero-freelancer.jpg';

export default function ProfessionalsDirectory() {
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
  } = useDirectoryProfiles({ accountType: 'freelancer', pageSize: 20 });

  return (
    <AppLayout>
      <Helmet>
        <title>Professionals & Freelancers Directory | Wathaci Connect</title>
        <meta name="description" content="Find verified professionals and freelancers across Zambia. Browse by skills, location, and expertise." />
      </Helmet>

      <PageHero
        title="Professionals Directory"
        description="Discover skilled professionals and freelancers ready to help your business grow"
        backgroundImage={heroFreelancer}
      >
        <DonateButton />
      </PageHero>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Browse Professionals</h2>
              <p className="text-muted-foreground">
                {totalCount} professional{totalCount !== 1 ? 's' : ''} available
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
            emptyMessage="No professionals found"
            emptyDescription="Be the first to join as a professional! Sign up and complete your profile to appear here."
          />
        </div>
      </div>
    </AppLayout>
  );
}
