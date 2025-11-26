import { useEffect, useMemo, useState } from 'react';
import { useImpactMetrics } from '@/hooks/useImpactMetrics';
import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  Heart,
  DollarSign,
  Target,
  Award,
  Globe,
  Layers3,
  Sparkles,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';

const formatNumber = (value: number) => value.toLocaleString();

const formatCurrency = (amount: number) => {
  if (!amount) return 'ZMW 0';
  if (amount >= 1_000_000) {
    return `ZMW ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `ZMW ${(amount / 1_000).toFixed(0)}K`;
  }
  return `ZMW ${amount.toLocaleString()}`;
};

const StatsSection = () => {
  const { metrics, status, reload } = useImpactMetrics();
  const [animatedUserCounts, setAnimatedUserCounts] = useState(metrics.user_counts);
  const [animatedActivityMetrics, setAnimatedActivityMetrics] = useState(metrics.activity_metrics);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();

    const animate = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / duration, 1);

      setAnimatedUserCounts(
        Object.fromEntries(
          Object.entries(metrics.user_counts).map(([key, value]) => [
            key,
            Math.floor((value as number) * progress),
          ]),
        ) as typeof metrics.user_counts,
      );

      setAnimatedActivityMetrics(
        Object.fromEntries(
          Object.entries(metrics.activity_metrics).map(([key, value]) => [
            key,
            Math.floor((value as number) * progress),
          ]),
        ) as typeof metrics.activity_metrics,
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [metrics]);

  const userGrowthStats = useMemo(
    () => [
      {
        icon: Users,
        label: 'Total Registered Users',
        value: animatedUserCounts.total_users,
        highlight: true,
        accent: 'from-orange-500 to-orange-600',
      },
      {
        icon: Briefcase,
        label: 'Professionals',
        value: animatedUserCounts.professionals,
        accent: 'from-blue-500 to-indigo-500',
      },
      {
        icon: Building2,
        label: 'SMEs',
        value: animatedUserCounts.smes,
        accent: 'from-emerald-500 to-green-500',
      },
      {
        icon: Layers3,
        label: 'Firms & Investors',
        value: animatedUserCounts.firms,
        accent: 'from-purple-500 to-fuchsia-500',
      },
      {
        icon: Globe,
        label: 'Companies / Gov',
        value: animatedUserCounts.companies,
        accent: 'from-cyan-500 to-sky-500',
      },
      {
        icon: Sparkles,
        label: 'Students',
        value: animatedUserCounts.students,
        accent: 'from-yellow-500 to-amber-500',
      },
      {
        icon: Heart,
        label: 'Others',
        value: animatedUserCounts.others,
        accent: 'from-rose-500 to-pink-500',
      },
    ],
    [animatedUserCounts],
  );

  const activityStats = useMemo(
    () => [
      {
        icon: Target,
        label: 'Projects Posted',
        value: animatedActivityMetrics.projects_posted,
        accent: 'from-indigo-500 to-blue-500',
        description: 'Opportunities created across the network',
      },
      {
        icon: Award,
        label: 'Successful Matches',
        value: animatedActivityMetrics.successful_matches,
        accent: 'from-green-500 to-emerald-500',
        description: 'SME ↔ Professional engagements closed',
      },
      {
        icon: MessageCircle,
        label: 'Messages Exchanged',
        value: animatedActivityMetrics.messages_sent,
        accent: 'from-purple-500 to-violet-500',
        description: 'Conversations powering collaboration',
      },
      {
        icon: RefreshCw,
        label: 'Returning Users (30d)',
        value: animatedActivityMetrics.returning_users,
        accent: 'from-teal-500 to-cyan-500',
        description: 'Engaged members back this month',
      },
      {
        icon: TrendingUp,
        label: 'Sign-ups (30d)',
        value: animatedActivityMetrics.signups_last_30_days,
        accent: 'from-orange-500 to-amber-500',
        description: 'New accounts activated recently',
      },
      {
        icon: Users,
        label: 'Active Sessions (24h)',
        value: animatedActivityMetrics.active_sessions,
        accent: 'from-blue-500 to-sky-500',
        description: 'People collaborating right now',
      },
      {
        icon: DollarSign,
        label: 'Gross Revenue',
        value: animatedActivityMetrics.platform_revenue,
        formatter: formatCurrency,
        accent: 'from-emerald-500 to-green-500',
        description: 'Total processed volume (completed)',
      },
      {
        icon: Heart,
        label: 'Support Queries Resolved',
        value: animatedActivityMetrics.support_queries_resolved,
        accent: 'from-pink-500 to-rose-500',
        description: 'Members helped by our success team',
      },
    ],
    [animatedActivityMetrics],
  );

  const hasError = Boolean(status.error);

  return (
    <section className="py-16 px-6 bg-gradient-to-b from-white to-orange-50/60" aria-labelledby="impact-growth-heading">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] font-semibold text-orange-500">Live platform telemetry</p>
            <h2 id="impact-growth-heading" className="text-3xl font-bold text-gray-900 mt-3">
              Our Impact & Growth
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mt-2">
              Every number you see below is sourced directly from active WATHACI Connect activity and profiles—updated in real time so you can trust the momentum.
            </p>
          </div>
          <button
            type="button"
            onClick={reload}
            aria-label={status.loading ? "Refreshing metrics..." : "Refresh metrics"}
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={status.loading}
          >
            <RefreshCw className={`w-4 h-4 ${status.loading ? 'animate-spin' : ''}`} />
            Refresh metrics
          </button>
        </div>

        {hasError && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
            We could not load the latest metrics automatically. Showing the most recent cached values instead.
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl ring-1 ring-gray-100 overflow-hidden">
          <div className="grid md:grid-cols-3 gap-6 p-8 bg-gradient-to-r from-orange-500/10 via-white to-amber-50">
            <div className="col-span-2">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">User Growth</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userGrowthStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${stat.accent} text-white mb-3 shadow`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-gray-900">
                          {formatNumber(stat.value)}
                        </p>
                        {stat.highlight && (
                          <span className="text-xs font-semibold text-orange-600 px-2 py-1 bg-orange-50 rounded-full">Platform total</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-500 to-amber-500 text-white p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-6 h-6" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] font-semibold text-orange-100">Economic impact</p>
                  <p className="text-xl font-semibold">Gross Revenue</p>
                </div>
              </div>
              <p className="text-4xl font-bold leading-tight mb-2">{formatCurrency(animatedActivityMetrics.platform_revenue)}</p>
              <p className="text-sm text-orange-50">
                Completed transaction volume driven by SMEs, professionals, and partners on the platform.
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Platform Activity</h3>
              <span className="text-sm text-gray-500">Auto-updates every 10 minutes</span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {activityStats.map((stat) => {
                const Icon = stat.icon;
                const value = stat.formatter ? stat.formatter(stat.value) : formatNumber(stat.value);
                return (
                  <div
                    key={stat.label}
                    className="group rounded-2xl border border-gray-100 bg-gray-50/60 p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                  >
                    <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${stat.accent} text-white mb-3 shadow`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    <p className="text-sm font-semibold text-gray-700 mt-1">{stat.label}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">{stat.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[{
            title: 'Proven Growth',
            description: 'Live user acquisition, engagement, and revenue signals prove market pull across Zambia and beyond.',
          },
          {
            title: 'Operational Resilience',
            description: 'Real-time telemetry, audits, and support resolution data keep the platform healthy and transparent.',
          },
          {
            title: 'Community Impact',
            description: 'Every successful match and conversation represents SMEs getting the expertise they need to thrive.',
          }].map((item) => (
            <div key={item.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { StatsSection };
export default StatsSection;