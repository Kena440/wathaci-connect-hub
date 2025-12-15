import { Link } from 'react-router-dom';
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/supportEmail';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="inline-block cursor-pointer group">
              <img
                src="https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png"
                alt="Wathaci Connect"
                loading="lazy"
                decoding="async"
                className="h-18 w-auto brightness-0 invert drop-shadow-lg group-hover:scale-105 transition-transform duration-200"
              />
            </Link>
            <p className="text-gray-300 text-sm">
              Empowering Zambian businesses through professional services, collaboration, and growth opportunities.
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com/wathaci" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-orange-400 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/wathaci" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-orange-400 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com/company/wathaci" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-orange-400 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="https://instagram.com/wathaci" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-orange-400 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-orange-400">Services</h3>
            <ul className="space-y-2">
              <li><Link to="/marketplace" className="text-gray-300 hover:text-white transition-colors">Marketplace</Link></li>
              <li><Link to="/freelancer-hub" className="text-gray-300 hover:text-white transition-colors">Freelancer Hub</Link></li>
              <li><Link to="/partnership-hub" className="text-gray-300 hover:text-white transition-colors">Partnership Hub</Link></li>
              <li><Link to="/resources" className="text-gray-300 hover:text-white transition-colors">Resources</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-orange-400">Support</h3>
            <ul className="space-y-2">
              <li><Link to="/get-started" className="text-gray-300 hover:text-white transition-colors">Get Started</Link></li>
              <li>
                <a
                  href="https://wathaci.com/help"
                  className="text-gray-300 hover:text-white transition-colors"
                  target="_blank"
                  rel="noreferrer"
                >
                  Help Center
                </a>
              </li>
              <li><Link to="/privacy-policy" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="text-gray-300 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-orange-400">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-orange-400" />
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gray-300 text-sm hover:text-white transition-colors">
                {SUPPORT_EMAIL}
              </a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-orange-400" />
                <a href="tel:+260972896005" className="text-gray-300 text-sm hover:text-white transition-colors">
                  +260 972 896 005
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span className="text-gray-300 text-sm">Lusaka, Zambia</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2024 Wathaci Connect. All rights reserved. | Transforming Zambian Business Excellence
          </p>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
export default Footer;