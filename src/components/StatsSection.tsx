import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-enhanced';
import { Building2, Users, Briefcase, TrendingUp, Heart, DollarSign, Target, Award, Globe } from 'lucide-react';

interface Stats {
  smes: number;
  professionals: number;
  freelancers: number;
  investors: number;
  donors: number;
  totalFunding: number;
  projectsCompleted: number;
  jobsCreated: number;
  countriesServed: number;
  successStories: number;
}

const StatsSection = () => {
  const [stats, setStats] = useState<Stats>({
    smes: 0,
    professionals: 0,
    freelancers: 0,
    investors: 0,
    donors: 0,
    totalFunding: 0,
    projectsCompleted: 0,
    jobsCreated: 0,
    countriesServed: 0,
    successStories: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImpactStats();
  }, []);

  const fetchImpactStats = async () => {
    try {
      // Add timeout to prevent long loading states
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000);
      });

      // Fetch business stats from database with timeout
      const statsPromise = supabase
        .from('business_stats')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      const { data: businessStats, error } = await Promise.race([
        statsPromise,
        timeoutPromise
      ]) as any;

      if (error) throw error;

      const toNumber = (value: unknown) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return Number(value) || 0;
        return 0;
      };

      // Convert business stats to our format using numeric values
      const statsMap =
        businessStats?.reduce((acc: Record<string, number>, stat: any) => {
          acc[stat.stat_type] = toNumber(stat.stat_value);
          return acc;
        }, {} as Record<string, number>) || {};

      // Fetch user type counts as fallback with timeout protection
      const userQueries = await Promise.allSettled([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_type', 'sole_proprietor'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_type', 'professional'),
        supabase.from('freelancers').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_type', 'investor'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_type', 'donor')
      ]);

      const [smesResult, professionalsResult, freelancersResult, investorsResult, donorsResult] = userQueries;
      
      const smesCount = smesResult.status === 'fulfilled' ? smesResult.value.count : 0;
      const professionalsCount = professionalsResult.status === 'fulfilled' ? professionalsResult.value.count : 0;
      const freelancersCount = freelancersResult.status === 'fulfilled' ? freelancersResult.value.count : 0;
      const investorsCount = investorsResult.status === 'fulfilled' ? investorsResult.value.count : 0;
      const donorsCount = donorsResult.status === 'fulfilled' ? donorsResult.value.count : 0;

      setStats({
        smes: smesCount || statsMap.businesses || 0,
        professionals: professionalsCount || statsMap.professionals || 0,
        freelancers: freelancersCount || statsMap.freelancers || 0,
        investors: investorsCount || statsMap.investors || 0,
        donors: donorsCount || statsMap.donors || 0,
        totalFunding: statsMap.funding || 0,
        projectsCompleted: statsMap.transactions || 0,
        jobsCreated: statsMap.jobs_created || 0,
        countriesServed: statsMap.countries_served || 0,
        successStories: statsMap.success_stories || 0
      });
    } catch (error) {
      console.error('Error fetching impact stats:', error);
      setStats({
        smes: 0,
        professionals: 0,
        freelancers: 0,
        investors: 0,
        donors: 0,
        totalFunding: 0,
        projectsCompleted: 0,
        jobsCreated: 0,
        countriesServed: 0,
        successStories: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const impactStats = [
    {
      icon: DollarSign,
      value: loading ? '...' : formatCurrency(stats.totalFunding),
      label: 'Total Funding Raised',
      color: 'text-green-600',
      description: 'Capital mobilized for SME growth',
      hidden: true
    },
    {
      icon: Target,
      value: loading ? '...' : stats.projectsCompleted.toLocaleString(),
      label: 'Projects Completed',
      color: 'text-blue-600',
      description: 'Successful business initiatives',
      hidden: true
    },
    {
      icon: Users,
      value: loading ? '...' : stats.jobsCreated.toLocaleString(),
      label: 'Jobs Created',
      color: 'text-purple-600',
      description: 'Employment opportunities generated',
      hidden: true
    },
    {
      icon: Building2,
      value: loading ? '...' : stats.smes.toLocaleString(),
      label: 'SMEs Supported',
      color: 'text-orange-600',
      description: 'Small businesses empowered'
    },
    {
      icon: Briefcase,
      value: loading ? '...' : stats.professionals.toLocaleString(),
      label: 'Business Professionals',
      color: 'text-amber-600',
      description: 'Operators and SME leads onboarded'
    },
    {
      icon: Target,
      value: loading ? '...' : stats.freelancers.toLocaleString(),
      label: 'Independent Freelancers',
      color: 'text-cyan-600',
      description: 'Service providers available for projects'
    },
    {
      icon: TrendingUp,
      value: loading ? '...' : stats.investors.toLocaleString(),
      label: 'Active Investors',
      color: 'text-indigo-600',
      description: 'Funding partners engaged'
    },
    {
      icon: Heart,
      value: loading ? '...' : stats.donors.toLocaleString(),
      label: 'Donors & Supporters',
      color: 'text-red-600',
      description: 'Community champions'
    },
    {
      icon: Award,
      value: loading ? '...' : stats.successStories.toLocaleString(),
      label: 'Success Stories',
      color: 'text-yellow-600',
      description: 'Projects with verified outcomes'
    },
    {
      icon: Globe,
      value: loading ? '...' : stats.countriesServed.toString(),
      label: 'Countries Served',
      color: 'text-teal-600',
      description: 'Regional impact reach'
    }
  ].filter(stat => !stat.hidden);

  return (
    <section className="py-16 bg-gradient-to-r from-orange-50 to-green-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Impact & Growth
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Real impact metrics that demonstrate our platform's success in empowering SMEs,
              creating jobs, and driving economic growth across Africa
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {impactStats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="text-center bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <IconComponent className={`w-8 h-8 ${stat.color}`} />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-800 font-semibold mb-1">
                    {stat.label}
                  </div>
                  <div className="text-sm text-gray-500">
                    {stat.description}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Why Invest in WATHACI Connect?
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Proven Track Record</h4>
                <p className="text-sm text-gray-600">
                  Consistent growth in user adoption and successful project completion rates
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Scalable Impact</h4>
                <p className="text-sm text-gray-600">
                  Each investment multiplies across our network, creating exponential value
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Sustainable Growth</h4>
                <p className="text-sm text-gray-600">
                  Building long-term economic development through SME empowerment
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { StatsSection };
export default StatsSection;