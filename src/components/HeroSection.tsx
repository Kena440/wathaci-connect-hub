import { Button } from '@/components/ui/button';
import { ArrowRight, Users, TrendingUp, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section className="hero-section relative overflow-hidden py-28 lg:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 -top-16 hidden md:block h-[28rem] w-[28rem] rounded-[3rem] shadow-[0_40px_120px_-30px_rgba(15,23,42,0.35)] ring-4 ring-white/80">
          <img
            src="/images/ChatGPT%20Image%20Sep%2023%2C%202025%2C%2001_53_02%20PM.png"
            alt="Zambian entrepreneurs collaborating"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover brightness-105 contrast-110"
          />
        </div>
        <div className="absolute -bottom-24 -right-16 hidden lg:block h-[34rem] w-[30rem] rounded-[3rem] shadow-[0_40px_120px_-40px_rgba(15,23,42,0.45)] ring-4 ring-white/80">
          <img
            src="/images/ChatGPT%20Image%20Sep%2023%2C%202025%2C%2002_14_37%20PM.png"
            alt="Business owner reviewing reports"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover brightness-105 contrast-110"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/55 via-white/35 to-white/20 backdrop-blur-[1px]" />
      </div>

      <div className="relative z-10 max-w-[74rem] mx-auto px-6 lg:px-10">
        <div className="hero-content-panel text-center mb-16 lg:mb-20 max-w-4xl mx-auto">
          <div className="mb-10 flex justify-center">
            <img
              src="https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png"
              alt="WATHACI CONNECT"
              loading="lazy"
              decoding="async"
              className="h-32 w-auto drop-shadow-2xl"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold lg:font-bold text-white mb-6 leading-tight tracking-tight drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            Empowering Zambian
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-400 to-green-500"> Business Excellence</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
            Connect with professional services, find skilled freelancers, and access resources
            designed specifically for Zambian businesses. Your gateway to growth and success.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center">
            <Link to="/get-started">
              <Button
                size="lg"
                className="rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-8 py-3 text-lg font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-all duration-300 ease-out hover:-translate-y-0.5"
              >
                Get Started Today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl border-2 border-white/60 bg-white/10 text-white hover:bg-white/20 px-8 py-3 text-lg font-semibold backdrop-blur-[2px] transition-all duration-300 ease-out hover:-translate-y-0.5"
              >
                Explore Marketplace
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20 lg:mt-24">
          <div
            role="button"
            tabIndex={0}
            data-analytics-id="professional-network"
            aria-label="Join the professional network"
            title="Expand your professional contacts"
            className="text-center p-6 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-blue-100/80 hover:shadow-xl focus:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
            className="text-center p-6 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-green-100/80 hover:shadow-xl focus:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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
            className="text-center p-6 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-amber-100/80 hover:shadow-xl focus:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
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
