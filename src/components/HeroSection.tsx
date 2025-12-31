import { Button } from '@/components/ui/button';
import { ArrowRight, Users, TrendingUp, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import wathciLogo from '@/assets/wathaci-logo.png';

const HeroSection = () => {
  return (
    <section className="relative bg-background py-20 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 pattern-dots opacity-30" />
      
      {/* Gradient Accent */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-accent/5 to-transparent" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-primary/5 to-transparent" />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="mb-8">
            <img
              src={wathciLogo}
              alt="WATHACI CONNECT"
              loading="lazy"
              decoding="async"
              className="h-28 w-auto mx-auto drop-shadow-2xl animate-fade-in"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6 leading-tight animate-slide-in">
            Empowering Zambian
            <span className="block text-accent"> Business Excellence</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Connect with professional services, find skilled freelancers, and access resources 
            designed specifically for Zambian businesses. Your gateway to growth and success.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/get-started">
              <Button 
                size="lg" 
                className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 text-lg shadow-glow hover:shadow-glow-lg transition-all duration-300"
              >
                Get Started Today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button 
                variant="outline" 
                size="lg" 
                className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3 text-lg transition-all duration-300"
              >
                Explore Marketplace
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="text-center p-6 bg-card rounded-xl shadow-lg border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Professional Network</h3>
            <p className="text-muted-foreground">
              Connect with verified professionals and service providers across Zambia
            </p>
          </div>

          <div className="text-center p-6 bg-card rounded-xl shadow-lg border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-16 h-16 bg-[hsl(142,70%,35%)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Business Growth</h3>
            <p className="text-muted-foreground">
              Access tools and resources designed to accelerate your business growth
            </p>
          </div>

          <div className="text-center p-6 bg-card rounded-xl shadow-lg border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Award className="w-8 h-8 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Quality Assurance</h3>
            <p className="text-muted-foreground">
              All services and professionals are vetted for quality and reliability
            </p>
          </div>
        </div>

        {/* Zambian Flag Inspired Divider */}
        <div className="flex h-1 mt-16 rounded-full overflow-hidden max-w-xl mx-auto">
          <div className="flex-1 bg-[hsl(142,70%,35%)]" />
          <div className="flex-1 bg-[hsl(0,75%,50%)]" />
          <div className="flex-1 bg-[hsl(0,0%,10%)]" />
          <div className="flex-1 bg-accent" />
        </div>
      </div>
    </section>
  );
};

export { HeroSection };
export default HeroSection;