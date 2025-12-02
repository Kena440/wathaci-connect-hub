import { Button } from '@/components/ui/button';
import { ArrowRight, Users, TrendingUp, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/55 via-white/35 to-white/20 backdrop-blur-[1px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="mb-8">
            <img
              src="https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png"
              alt="WATHACI CONNECT"
              loading="lazy"
              decoding="async"
              className="h-32 w-auto mx-auto drop-shadow-2xl"
            />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Empowering Zambian
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-green-600"> Business Excellence</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Connect with professional services, find skilled freelancers, and access resources
            designed specifically for Zambian businesses. Your gateway to growth and success.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/onboarding">
              <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-8 py-3 text-lg">
                Join the Founding Cohort – Create Your Profile
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/get-started">
              <Button size="lg" className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-8 py-3 text-lg">
                Get Started Today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="outline" size="lg" className="border-2 border-green-600 text-green-700 hover:bg-green-50 px-8 py-3 text-lg">
                Explore Marketplace
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div
            role="button"
            tabIndex={0}
            data-analytics-id="professional-network"
            aria-label="Join the professional network"
            title="Expand your professional contacts"
            className="text-center p-6 bg-white rounded-xl shadow-lg border border-blue-100 hover:shadow-xl focus:shadow-xl transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users aria-hidden="true" className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect with Pros</h3>
            <p className="text-gray-600">
              Connect with verified professionals and service providers across Zambia
            </p>
          </div>

          <div
            role="button"
            tabIndex={0}
            data-analytics-id="business-growth"
            aria-label="Grow your business"
            title="Access tools to accelerate your business"
            className="text-center p-6 bg-white rounded-xl shadow-lg border border-green-100 hover:shadow-xl focus:shadow-xl transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp aria-hidden="true" className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Grow Your Business</h3>
            <p className="text-gray-600">
              Access tools and resources designed to accelerate your business growth
            </p>
          </div>

          <div
            role="button"
            tabIndex={0}
            data-analytics-id="quality-assurance"
            aria-label="Ensure quality"
            title="Work with vetted, reliable professionals"
            className="text-center p-6 bg-white rounded-xl shadow-lg border border-amber-100 hover:shadow-xl focus:shadow-xl transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck aria-hidden="true" className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ensure Quality</h3>
            <p className="text-gray-600">
              All services and professionals are vetted for quality and reliability
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export { HeroSection };
export default HeroSection;
