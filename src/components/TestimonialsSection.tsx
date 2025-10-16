import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { supabase } from '@/lib/supabase-enhanced';

interface Testimonial {
  id: string;
  client_name: string;
  client_title: string;
  client_company: string;
  client_image_url?: string;
  testimonial_text: string;
  rating: number;
  service_category: string;
  featured: boolean;
}

const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('status', 'active')
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative py-16 px-6 overflow-hidden">
      <div
        className="absolute inset-0 bg-center bg-cover opacity-30"
        style={{
          backgroundImage:
            "url('/images/ChatGPT%20Image%20Sep%2023%2C%202025%2C%2002_14_20%20PM.png')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white/75 to-emerald-50/80" />
      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-amber-100 text-amber-800 border-amber-300">
            Client Success Stories
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Trusted by Zambian Businesses
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how we've helped businesses across Zambia achieve their goals
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading testimonials...</p>
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Client testimonials coming soon!</p>
            <p className="text-gray-400 mt-2">We're collecting feedback from our amazing clients.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all transform hover:-translate-y-2">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 italic">
                    "{testimonial.testimonial_text}"
                  </p>
                  <div className="flex items-center space-x-3">
                    <img
                      src={testimonial.client_image_url || '/placeholder.svg'}
                      alt={testimonial.client_name}
                      loading="lazy"
                      decoding="async"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.client_name}</p>
                      <p className="text-sm text-gray-600">{testimonial.client_title}</p>
                      <p className="text-sm text-gray-500">{testimonial.client_company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <div className="flex justify-center items-center space-x-8 opacity-60">
            <div className="text-2xl font-bold text-gray-500">PACRA</div>
            <div className="text-2xl font-bold text-gray-500">ZRA</div>
            <div className="text-2xl font-bold text-gray-500">SEC</div>
            <div className="text-2xl font-bold text-gray-500">BOZ</div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Trusted partners in regulatory compliance</p>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;