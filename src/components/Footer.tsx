import { Link } from 'react-router-dom';
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import wathciLogo from '@/assets/wathaci-logo.png';

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="inline-block cursor-pointer group">
              <img
                src={wathciLogo}
                alt="WATHACI CONNECT"
                loading="lazy"
                decoding="async"
                className="h-14 w-auto brightness-0 invert drop-shadow-lg group-hover:scale-105 transition-transform duration-200"
              />
            </Link>
            <p className="text-primary-foreground/80 text-sm">
              Empowering Zambian businesses through professional services, collaboration, and growth opportunities.
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com/wathaci" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/70 hover:text-accent transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/wathaci" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/70 hover:text-accent transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com/company/wathaci" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/70 hover:text-accent transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="https://instagram.com/wathaci" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/70 hover:text-accent transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-accent">Services</h3>
            <ul className="space-y-2">
              <li><Link to="/marketplace" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Marketplace</Link></li>
              <li><Link to="/freelancer-hub" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Freelancer Hub</Link></li>
              <li><Link to="/partnership-hub" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Partnership Hub</Link></li>
              <li><Link to="/resources" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Resources</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-accent">Support</h3>
            <ul className="space-y-2">
              <li><Link to="/donate" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors flex items-center gap-1">❤️ Donate</Link></li>
              <li><Link to="/get-started" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Get Started</Link></li>
              <li><Link to="/resources" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Help Center</Link></li>
              <li><Link to="/privacy-policy" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-accent">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-accent" />
                <a href="mailto:info@wathaci.org" className="text-primary-foreground/80 text-sm hover:text-primary-foreground transition-colors">
                  info@wathaci.org
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-accent" />
                <a href="tel:+260972896005" className="text-primary-foreground/80 text-sm hover:text-primary-foreground transition-colors">
                  +260 972 896 005
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-accent" />
                <span className="text-primary-foreground/80 text-sm">Lusaka, Zambia</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zambian Flag Stripe */}
        <div className="flex h-1 mt-8 rounded-full overflow-hidden">
          <div className="flex-1 bg-[hsl(142,70%,35%)]" />
          <div className="flex-1 bg-[hsl(0,75%,50%)]" />
          <div className="flex-1 bg-[hsl(0,0%,10%)]" />
          <div className="flex-1 bg-accent" />
        </div>

        <div className="mt-6 pt-6 text-center">
          <p className="text-primary-foreground/60 text-sm">
            © 2024 WATHACI CONNECT. All rights reserved. | Transforming Zambian Business Excellence
          </p>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
export default Footer;