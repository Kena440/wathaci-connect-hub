import React from 'react';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from '@/config/navItems';
import { NavItem } from './NavItem';

type NavBarProps = {
  activePath?: string;
};

const NavBarComponent: React.FC<NavBarProps> = ({ activePath }) => {
  const { t } = useTranslation();

  const [isDesktop, setIsDesktop] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isItemActive = React.useCallback(
    (href: string) => {
      if (!activePath) return false;
      if (href === '/') return activePath === '/';
      return activePath.startsWith(href);
    },
    [activePath]
  );

  if (!isDesktop) {
    return null;
  }

  return (
    <nav className="hidden md:flex flex-1">
      <div className="nav-container">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            label={t(item.label)}
            href={item.href}
            isActive={isItemActive(item.href)}
          />
        ))}
      </div>
    </nav>
  );
};

export const NavBar = React.memo(NavBarComponent);
