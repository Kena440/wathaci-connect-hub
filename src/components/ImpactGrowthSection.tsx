import React from 'react';
import { supabase, supabaseConfigStatus } from '@/lib/supabaseClient';
import { ComingSoonCard } from '@/components/ui/ComingSoonCard';
import { getBooleanEnv } from '@/utils/getBooleanEnv';

export type ImpactMetric = {
  id: string;
  label: string;
  value: number | null;
  suffix?: string | null;
  is_public?: boolean | null;
  sort_order?: number | null;
};

const IMPACT_METRICS_ENABLED = getBooleanEnv('VITE_IMPACT_METRICS_ENABLED', true);

export const ImpactGrowthSection: React.FC = () => {
  const [metrics, setMetrics] = React.useState<ImpactMetric[] | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let isMounted = true;

    const supabaseReady = Boolean(
      supabaseConfigStatus?.hasValidConfig &&
        supabaseConfigStatus.resolvedUrl &&
        supabaseConfigStatus.resolvedAnonKey,
    );

    if (!IMPACT_METRICS_ENABLED) {
      setMetrics([]);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    if (!supabaseReady) {
      console.warn(
        '[ImpactGrowthSection] Supabase configuration missing; showing fallback content.',
      );
      setMetrics([]);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    async function loadMetrics() {
      try {
        const { data, error } = await supabase
          .from('impact_metrics')
          .select('id,label,value,suffix,is_public,sort_order')
          .eq('is_public', true)
          .order('sort_order', { ascending: true });

        if (!isMounted) return;

        if (error) {
          console.error('[ImpactGrowthSection] Supabase error:', error);
          setMetrics([]);
          return;
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
          setMetrics([]);
          return;
        }

        setMetrics(data as ImpactMetric[]);
      } catch (err) {
        if (!isMounted) return;
        console.error('[ImpactGrowthSection] Unexpected error:', err);
        setMetrics([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasMetrics = !!metrics && metrics.length > 0;
  const showComingSoon = !loading && !hasMetrics;

  return (
    <section id="impact" className="py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">
              Our Impact &amp; Growth
            </h2>
            <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl">
              Tracking how Wathaci Connect supports the SME ecosystem in Zambia through services, partnerships, and opportunities.
            </p>
          </div>
        </header>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {showComingSoon && (
          <ComingSoonCard
            title="Impact & Growth Metrics Coming Soon"
            body="We are finalising how we present our impact and growth metrics. This section will be updated as we onboard more SMEs, professionals, partners, and investment activity."
          />
        )}

        {!loading && hasMetrics && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics!.map((metric) => (
              <article
                key={metric.id}
                className="rounded-xl border border-slate-100 bg-white px-4 py-5 shadow-sm"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl md:text-3xl font-semibold text-slate-900">
                  {metric.value ?? '—'}
                  {metric.suffix ? (
                    <span className="ml-1 text-base font-normal text-slate-500">
                      {metric.suffix}
                    </span>
                  ) : null}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ImpactGrowthSection;
