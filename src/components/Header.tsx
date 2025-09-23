import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, Globe, User, LogOut, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NotificationCenter } from './NotificationCenter';
import { DonateButton } from './DonateButton';
import { useAppContext } from '@/contexts/AppContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, loading } = useAppContext();
  const { t, i18n } = useTranslation();

  const navItems = [
    { key: 'home', href: '/' },
    { key: 'marketplace', href: '/marketplace' },
    { key: 'freelancerHub', href: '/freelancer-hub' },
    { key: 'resources', href: '/resources' },
    { key: 'partnershipHub', href: '/partnership-hub' },
    { key: 'fundingHub', href: '/funding-hub' },
    { key: 'aboutUs', href: '/about-us' }
  ];

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  const showGetStarted = !user || !user.profile_completed;

  return (
    <header className="bg-gradient-to-r from-orange-50 to-green-50 shadow-lg sticky top-0 z-50 border-b-2 border-orange-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-3 cursor-pointer group">
            <img
              src="https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png"
              alt="WATHACI CONNECT"
              loading="lazy"
              decoding="async"
              className="h-24 w-auto drop-shadow-lg group-hover:scale-105 transition-transform duration-200"
            />
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.key}
                to={item.href}
                className="text-gray-800 hover:text-orange-600 font-semibold transition-colors text-lg"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            {user && <NotificationCenter />}
            {user && (
              <Link to="/messages">
                <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-orange-100">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {t('messages')}
                </Button>
              </Link>
            )}
            <DonateButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-orange-100">
                  <Globe className="w-4 h-4 mr-2" />
                  {(i18n.language || 'en').toUpperCase()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {['en', 'fr', 'sw'].map((lng) => (
                  <DropdownMenuItem key={lng} onSelect={() => i18n.changeLanguage(lng)}>
                    {lng.toUpperCase()}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {loading ? (
              <div className="w-20 h-9 bg-orange-200 animate-pulse rounded"></div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 border-orange-300 hover:bg-orange-50">
                    <User className="w-4 h-4" />
                    {user.email.split('@')[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile-review">{t('viewProfile')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile-setup">{t('editProfile')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/subscription-plans">{t('subscriptionPlans')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/signin">
                <Button variant="outline" size="sm" className="border-orange-300 hover:bg-orange-50">
                  {t('signIn')}
                </Button>
              </Link>
            )}

            {showGetStarted && (
              <Link to="/get-started">
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                  {t('getStarted')}
                </Button>
              </Link>
            )}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-orange-200">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  to={item.href}
                  className="text-gray-800 hover:text-orange-600 font-semibold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t(item.key)}
                </Link>
              ))}
              <div className="flex flex-col space-y-2 pt-4 border-t border-orange-200">
                {user && <NotificationCenter />}
                {user && (
                  <Link to="/messages">
                    <Button variant="outline" size="sm" className="w-full border-orange-300">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {t('messages')}
                    </Button>
                  </Link>
                )}
                <DonateButton />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full border-orange-300">
                      <Globe className="w-4 h-4 mr-2" />
                      {i18n.language.toUpperCase()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {['en', 'fr', 'sw'].map((lng) => (
                      <DropdownMenuItem key={lng} onSelect={() => i18n.changeLanguage(lng)}>
                        {lng.toUpperCase()}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {loading ? (
                  <div className="w-full h-9 bg-orange-200 animate-pulse rounded"></div>
                ) : user ? (
                  <>
                    <Link to="/profile-review">
                      <Button variant="outline" size="sm" className="w-full border-orange-300">
                        <User className="w-4 h-4 mr-2" />
                        {t('viewProfile')}
                      </Button>
                    </Link>
                    <Link to="/subscription-plans">
                      <Button variant="outline" size="sm" className="w-full border-orange-300">
                        {t('subscriptionPlans')}
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 border-red-300"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('signOut')}
                    </Button>
                  </>
                ) : (
                  <Link to="/signin">
                    <Button variant="outline" size="sm" className="w-full border-orange-300">
                      {t('signIn')}
                    </Button>
                  </Link>
                )}

                {showGetStarted && (
                  <Link to="/get-started">
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 w-full">
                      {t('getStarted')}
                    </Button>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export { Header };
export default Header;
