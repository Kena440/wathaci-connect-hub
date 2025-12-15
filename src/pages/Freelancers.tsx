import AppLayout from '@/components/AppLayout';
import SeoMeta from '@/components/SeoMeta';
import { FreelancerDirectory } from '@/components/FreelancerDirectory';
import { Button } from '@/components/ui/button';
import { Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const FreelancersPage = () => {
  return (
    <AppLayout>
      <SeoMeta
        title="Freelancers | Wathaci Connect"
        description="Discover verified professionals for compliance, finance, legal, and technology projects across Zambia. Post SME support requests and invite the right experts."
        canonicalPath="/freelancers"
      />
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-slate-900 via-emerald-800 to-slate-800 text-white py-14">
          <div className="max-w-6xl mx-auto px-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold uppercase tracking-wide">
              <Sparkles className="w-4 h-4" /> Verified Professionals
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Hire vetted freelancers and professional service providers
            </h1>
            <p className="text-lg text-white/80 max-w-3xl">
              Browse public profiles, filter by category and city, and invite experts directly to your SME support requests.
              AI recommendations stay server-side to keep your data safe.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600">
                <Link to="#directory">Post a request</Link>
              </Button>
              <Button variant="secondary" size="lg" asChild>
                <Link to="/signup">Join as a freelancer</Link>
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-white/80">
              <div className="rounded-xl bg-white/10 p-4">
                <p className="font-semibold text-white mb-1">Anonymous browsing</p>
                <p>Search and open public profiles before signing in. Contact actions require an account.</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <p className="font-semibold text-white mb-1">SME workflows</p>
                <p>Create briefs, save favourites, and invite professionals to structured requests.</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <p className="font-semibold text-white mb-1">Professional controls</p>
                <p>Update profiles, publish services, and respond to invitations from SMEs.</p>
              </div>
            </div>
          </div>
        </div>

        <div id="directory" className="max-w-6xl mx-auto px-6 py-12 space-y-10">
          <div className="rounded-2xl border bg-white p-6 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-600 uppercase">Marketplace directory</p>
              <h2 className="text-2xl font-bold text-slate-900">Browse freelancers</h2>
              <p className="text-slate-600">Public directory is indexable for SEO; private details stay protected.</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Users className="w-4 h-4" />
              SMEs can invite and save professionals after signing in.
            </div>
          </div>
          <FreelancerDirectory />
        </div>
      </div>
    </AppLayout>
  );
};

export default FreelancersPage;
