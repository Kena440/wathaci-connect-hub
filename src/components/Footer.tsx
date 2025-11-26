import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/supportEmail';
// import { useImpactMetrics } from '@/hooks/useImpactMetrics';

const formatNumber = (value: number) => value.toLocaleString();

type ImpactMetrics = {
  user_counts: {
    total_users: number;
    professionals: number;
    smes: number;
  };
  activity_metrics: {
    successful_matches: number;
    projects_posted: number;
    messages_sent: number;
  };
};

interface FooterProps {
  metrics: ImpactMetrics;
}

const Footer = ({ metrics }: FooterProps) => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const dynamicStatements = useMemo(
    () => [
      `WATHACI Connect is trusted by ${formatNumber(metrics.user_counts.total_users)} users across Zambia and Africa.`,
      `Serving ${formatNumber(metrics.user_counts.professionals)} professionals and ${formatNumber(metrics.user_counts.smes)} SMEs, bridging the gap between skills and opportunities.`,
      `Est. Growth: ${formatNumber(metrics.activity_metrics.successful_matches)} successful matches, ${formatNumber(metrics.activity_metrics.projects_posted)} posted projects, ${formatNumber(metrics.activity_metrics.messages_sent)} messages sent.`,
    ],
    [metrics.activity_metrics.messages_sent, metrics.activity_metrics.projects_posted, metrics.activity_metrics.successful_matches, metrics.user_counts.professionals, metrics.user_counts.smes, metrics.user_counts.total_users],
  );

  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white" aria-labelledby="footer-heading">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block cursor-pointer group" aria-label="Back to home">
              <img
                src="https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png"
                alt="WATHACI CONNECT"
                loading="lazy"
                decoding="async"
                className="h-18 w-auto brightness-0 invert drop-shadow-lg group-hover:scale-105 transition-transform duration-200"
              />
            </Link>
            <p className="text-gray-300 text-sm leading-relaxed">
              Empowering businesses through real-time collaboration between SMEs, professionals, and partners.
            </p>

            <div className="space-y-2 bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-300" />
                <p className="text-sm text-gray-100">Live platform proof points</p>
              </div>
              {dynamicStatements.map((statement) => (
                <p key={statement} className="text-gray-200 text-sm leading-relaxed">
                  {statement}
                </p>
              ))}
            </div>

            <div className="flex space-x-4">
              <a href="https://facebook.com/wathaci" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-orange-400 transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/wathaci" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-orange-400 transition-colors" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com/company/wathaci" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-orange-400 transition-colors" aria-label="LinkedIn">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="https://instagram.com/wathaci" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-orange-400 transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-orange-400" id="footer-heading">Quick Links</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link to="/sme-hub" className="hover:text-white transition-colors">SME Hub</Link></li>
              <li><Link to="/freelancer-hub" className="hover:text-white transition-colors">Freelancer Hub</Link></li>
              <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-orange-400">Resources</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li><Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link></li>
              <li><Link to="/partnership-hub" className="hover:text-white transition-colors">Partnership Hub</Link></li>
              <li><Link to="/resources" className="hover:text-white transition-colors">Guides & Insights</Link></li>
              <li><Link to="/get-started" className="hover:text-white transition-colors">Get Started</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-orange-400">Legal</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li><Link to="/terms-of-service" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link></li>
              <li><Link to="/security" className="hover:text-white transition-colors">Security</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-orange-400">Contact</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-orange-400" />
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition-colors">
                  {SUPPORT_EMAIL}
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-orange-400" />
                <a href="tel:+260972896005" className="hover:text-white transition-colors">
                  +260 972 896 005
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span>Lusaka, Zambia</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-gray-300 text-sm">
            © <span id="footer-year">{currentYear}</span> WATHACI CONNECT. All rights reserved. | Transforming Zambian Business Excellence
          </p>
          <p className="text-xs text-gray-400">Updated continuously from live platform data.</p>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
export default Footer;