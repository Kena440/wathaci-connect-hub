import React from 'react';
import { supabase, supabaseConfigStatus } from '@/lib/supabaseClient';
import { ComingSoonCard } from '@/components/ui/ComingSoonCard';
import { getBooleanEnv } from '@/utils/getBooleanEnv';

type Testimonial = {
  id: string;
  name: string | null;
  role: string | null;
  company: string | null;
  quote: string;
  status?: string | null;
  is_featured?: boolean | null;
};

const TESTIMONIALS_ENABLED = getBooleanEnv('VITE_TESTIMONIALS_ENABLED', false);
const TRUSTED_PARTNERS_ENABLED = getBooleanEnv('VITE_TRUSTED_PARTNERS_ENABLED', false);

export const TestimonialsSection: React.FC = () => {
  const [testimonials, setTestimonials] = React.useState<Testimonial[] | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let isMounted = true;

    const supabaseReady = Boolean(
      supabaseConfigStatus?.hasValidConfig &&
        supabaseConfigStatus.resolvedUrl &&
        supabaseConfigStatus.resolvedAnonKey,
    );

    if (!TESTIMONIALS_ENABLED) {
      setTestimonials([]);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    if (!supabaseReady) {
      console.warn(
        '[TestimonialsSection] Supabase configuration missing; showing fallback content.',
      );
      setTestimonials([]);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    async function loadTestimonials() {
      try {
        const { data, error } = await supabase
          .from('testimonials')
          .select('id,name,role,company,quote,status,is_featured,created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(6);

        if (!isMounted) return;

        if (error) {
          console.error('[TestimonialsSection] Supabase error:', error);
          setTestimonials([]);
          return;
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
          setTestimonials([]);
          return;
        }

        setTestimonials(data as Testimonial[]);
      } catch (err) {
        if (!isMounted) return;
        console.error('[TestimonialsSection] Unexpected error:', err);
        setTestimonials([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTestimonials();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasTestimonials = !!testimonials && testimonials.length > 0;
  const showComingSoon = !loading && !hasTestimonials;
  const partnerItems: unknown[] = [];
  const showPartnersComingSoon = !TRUSTED_PARTNERS_ENABLED || partnerItems.length === 0;

  return (
    <section id="testimonials" className="py-12 md:py-16 bg-white">
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-6 md:mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">
            What Our Users Are Saying
          </h2>
          <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
            Stories from SMEs, professionals, and partners using Wathaci Connect to unlock business opportunities and growth in Zambia.
          </p>
        </header>

        {loading && TESTIMONIALS_ENABLED && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {showComingSoon && (
          <ComingSoonCard
            title="Testimonials Coming Soon"
            body="We are curating stories from SMEs, professionals, and partners using Wathaci Connect. This section will be updated once live testimonials are ready."
          />
        )}

        {!loading && hasTestimonials && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials!.map((t) => (
              <article
                key={t.id}
                className="flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm"
              >
                <p className="text-sm text-slate-700 leading-relaxed">“{t.quote}”</p>
                <div className="mt-4 text-xs text-slate-500">
                  {t.name && <p className="font-semibold text-slate-800">{t.name}</p>}
                  {(t.role || t.company) && <p>{[t.role, t.company].filter(Boolean).join(' · ')}</p>}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-10">
          {showPartnersComingSoon && (
            <ComingSoonCard
              title="Trusted Partners Coming Soon"
              body="We are finalising agreements with regulatory and ecosystem partners. This section will be updated once formal partnerships are confirmed."
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
