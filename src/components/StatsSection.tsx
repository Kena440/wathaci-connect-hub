import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-enhanced';
import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  Heart,
  DollarSign,
  Target,
  Award,
  Globe
} from 'lucide-react';

type BusinessStat = {
  metric_key: string;
  label: string;
  value: number;
  unit?: string | null;
  description?: string | null;
};

const iconMap: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  total_funding_zmw: { icon: DollarSign, color: 'text-green-600' },
  projects_completed: { icon: Target, color: 'text-blue-600' },
  jobs_supported: { icon: Users, color: 'text-purple-600' },
  smes_supported: { icon: Building2, color: 'text-orange-600' },
  professionals: { icon: Briefcase, color: 'text-amber-600' },
  freelancers_active: { icon: Target, color: 'text-cyan-600' },
  investors: { icon: TrendingUp, color: 'text-indigo-600' },
  donors: { icon: Heart, color: 'text-red-600' },
  success_stories: { icon: Award, color: 'text-yellow-600' },
  countries_served: { icon: Globe, color: 'text-teal-600' },
  total_users: { icon: Users, color: 'text-gray-700' }
};

const StatsSection = () => {
  const [businessStats, setBusinessStats] = useState<BusinessStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchImpactStats();
  }, []);

  const fetchImpactStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('business_stats')
        .select('metric_key,label,value,unit,description,order_index,is_active')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setBusinessStats(data || []);
    } catch (err) {
      console.error('Error fetching impact stats:', err);
      setBusinessStats([]);
      setError('Impact metrics are updating. Please check back soon.');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (stat: BusinessStat) => {
    const numericValue = Number(stat.value || 0);
    const unit = (stat.unit || '').toLowerCase();

    if (stat.metric_key === 'total_funding_zmw' || unit === 'zmw') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'ZMW',
        maximumFractionDigits: 0
      }).format(numericValue);
    }

    return new Intl.NumberFormat('en-US').format(numericValue);
  };

  const skeletonCards = Array.from({ length: 4 }).map((_, index) => (
    <div
      key={`skeleton-${index}`}
      className="animate-pulse text-center bg-white p-6 rounded-xl shadow-lg border border-gray-100"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-24 mx-auto mb-2" />
      <div className="h-4 bg-gray-100 rounded w-32 mx-auto mb-1" />
      <div className="h-3 bg-gray-100 rounded w-40 mx-auto" />
    </div>
  ));

  const hasStats = businessStats.length > 0;

  const impactStats = hasStats
    ? businessStats.map(stat => {
        const iconConfig = iconMap[stat.metric_key] || { icon: Users, color: 'text-gray-700' };
        return {
          ...stat,
          valueLabel: formatValue(stat),
          icon: iconConfig.icon,
          color: iconConfig.color
        };
      })
    : [];

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
            {loading && !hasStats && skeletonCards}

            {!loading && hasStats && impactStats.map(stat => {
              const IconComponent = stat.icon;
              return (
                <div
                  key={stat.metric_key}
                  className="text-center bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <IconComponent className={`w-8 h-8 ${stat.color}`} />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {stat.valueLabel}
                  </div>
                  <div className="text-gray-800 font-semibold mb-1">
                    {stat.label}
                  </div>
                  <div className="text-sm text-gray-500">
                    {stat.description || 'Live impact metric'}
                  </div>
                </div>
              );
            })}

            {!loading && !hasStats && (
              <div className="col-span-full text-center text-gray-700 bg-white p-6 rounded-xl border border-gray-100">
                {error || 'Impact metrics are updating. Please check back soon.'}
              </div>
            )}
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