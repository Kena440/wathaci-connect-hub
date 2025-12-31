import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Users, TrendingUp, Heart, DollarSign, Target, Award, Globe } from 'lucide-react';

interface Stats {
  smes: number;
  professionals: number;
  investors: number;
  donors: number;
  totalFunding: number;
  ordersCompleted: number;
  servicesListed: number;
  countriesServed: number;
}

const StatsSection = () => {
  const [stats, setStats] = useState<Stats>({
    smes: 0,
    professionals: 0,
    investors: 0,
    donors: 0,
    totalFunding: 0,
    ordersCompleted: 0,
    servicesListed: 0,
    countriesServed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImpactStats();
  }, []);

  const fetchImpactStats = async () => {
    try {
      // Fetch profile counts by account type
      const [smesResult, professionalsResult, investorsResult, donorsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_type', 'sole_proprietor'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_type', 'professional'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_type', 'investor'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_type', 'donor')
      ]);

      // Fetch orders completed
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Fetch active services count
      const { count: servicesCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch total donations (successful)
      const { data: donationsData } = await supabase
        .from('donations')
        .select('amount')
        .eq('status', 'successful');
      
      const totalDonations = donationsData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

      // Fetch distinct countries from profiles
      const { data: countriesData } = await supabase
        .from('profiles')
        .select('country')
        .not('country', 'is', null);
      
      const uniqueCountries = new Set(countriesData?.map(p => p.country).filter(Boolean));

      setStats({
        smes: smesResult.count || 0,
        professionals: professionalsResult.count || 0,
        investors: investorsResult.count || 0,
        donors: donorsResult.count || 0,
        totalFunding: totalDonations,
        ordersCompleted: ordersCount || 0,
        servicesListed: servicesCount || 0,
        countriesServed: uniqueCountries.size || 1
      });
    } catch (error) {
      console.error('Error fetching impact stats:', error);
      setStats({
        smes: 0,
        professionals: 0,
        investors: 0,
        donors: 0,
        totalFunding: 0,
        ordersCompleted: 0,
        servicesListed: 0,
        countriesServed: 1
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
      description: 'Capital mobilized for SME growth'
    },
    {
      icon: Target,
      value: loading ? '...' : stats.ordersCompleted.toLocaleString(),
      label: 'Orders Completed',
      color: 'text-blue-600',
      description: 'Successful transactions'
    },
    {
      icon: Award,
      value: loading ? '...' : stats.servicesListed.toLocaleString(),
      label: 'Services Listed',
      color: 'text-purple-600',
      description: 'Active marketplace offerings'
    },
    {
      icon: Building2,
      value: loading ? '...' : stats.smes.toLocaleString(),
      label: 'SMEs Registered',
      color: 'text-orange-600',
      description: 'Small businesses on platform'
    },
    {
      icon: Users,
      value: loading ? '...' : stats.professionals.toLocaleString(),
      label: 'Professionals',
      color: 'text-indigo-600',
      description: 'Skilled service providers'
    },
    {
      icon: TrendingUp,
      value: loading ? '...' : stats.investors.toLocaleString(),
      label: 'Active Investors',
      color: 'text-cyan-600',
      description: 'Funding partners engaged'
    },
    {
      icon: Heart,
      value: loading ? '...' : stats.donors.toLocaleString(),
      label: 'Donors',
      color: 'text-red-600',
      description: 'Community supporters'
    },
    {
      icon: Globe,
      value: loading ? '...' : stats.countriesServed.toString(),
      label: 'Countries Served',
      color: 'text-teal-600',
      description: 'Regional impact reach'
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-r from-orange-50 to-green-50">
      <div className="max-w-7xl mx-auto px-6">
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
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4`}>
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
            Why Invest in Our Platform?
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
    </section>
  );
};

export { StatsSection };
export default StatsSection;