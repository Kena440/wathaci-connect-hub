import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

// Static testimonials until testimonials table is created
const staticTestimonials = [
  {
    id: '1',
    client_name: 'Jane Mwanza',
    client_title: 'CEO',
    client_company: 'Tech Solutions Zambia',
    testimonial_text: 'WATHACI Connect has transformed how we find and connect with investors. Highly recommended!',
    rating: 5,
  },
  {
    id: '2', 
    client_name: 'Peter Banda',
    client_title: 'Founder',
    client_company: 'AgriGrow Ltd',
    testimonial_text: 'The platform made it easy to showcase our business and attract the right partners.',
    rating: 5,
  },
];

const TestimonialsSection = () => {
  const [testimonials] = useState(staticTestimonials);

  return (
    <section className="py-16 px-6 bg-gradient-to-br from-blue-50 to-emerald-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-amber-100 text-amber-800 border-amber-300">
            Client Success Stories
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Trusted by Zambian Businesses
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.testimonial_text}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.client_name}</p>
                  <p className="text-sm text-gray-600">{testimonial.client_title}, {testimonial.client_company}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="inline-block px-6 py-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium text-muted-foreground">Trusted Partners</p>
            <p className="text-lg font-semibold text-foreground mt-1">Coming Soon</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
