import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Store, 
  Users, 
  BookOpen, 
  Handshake, 
  MessageCircle,
  User,
  LogOut,
  Settings,
  CreditCard,
  Menu,
  X,
  Globe,
  Heart,
  TrendingUp,
  Info,
  Shield,
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationCenter } from './NotificationCenter';
import wathciLogo from '@/assets/wathaci-logo.png';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Marketplace', href: '/marketplace', icon: Store },
  { name: 'Freelancer Hub', href: '/freelancer-hub', icon: Users },
  { name: 'Funding Hub', href: '/funding-hub', icon: TrendingUp },
  { name: 'Partnership Hub', href: '/partnership-hub', icon: Handshake },
  { name: 'Resources', href: '/resources', icon: BookOpen },
  { name: 'Wallet', href: '/wallet', icon: CreditCard },
];

const infoNavItems = [
  { name: 'About Us', href: '/about-us', icon: Info },
  { name: 'Privacy Policy', href: '/privacy-policy', icon: Shield },
  { name: 'Terms of Service', href: '/terms-of-service', icon: FileText },
];

export const AppSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, loading } = useAppContext();

  const handleSignOut = async () => {
    await signOut();
    setIsMobileOpen(false);
  };

  const showGetStarted = !user || !user.profile_completed;

  const isActive = (path: string) => location.pathname === path;

  const NavLink = ({ item }: { item: typeof mainNavItems[0] }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        to={item.href}
        onClick={() => setIsMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
          active 
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-glow" 
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground"
        )}
      >
        <Icon className={cn(
          "w-5 h-5 transition-transform group-hover:scale-110",
          active && "text-sidebar-accent-foreground"
        )} />
        {!isCollapsed && (
          <span className="font-medium">{item.name}</span>
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3" onClick={() => setIsMobileOpen(false)}>
          <img 
            src={wathciLogo} 
            alt="WATHACI Connect" 
            className={cn(
              "transition-all duration-300",
              isCollapsed ? "h-10 w-10 object-contain" : "h-14 w-auto"
            )}
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Main
            </p>
          )}
          {mainNavItems.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </div>

        {/* Messages (for logged in users) */}
        {user && (
          <Link
            to="/messages"
            onClick={() => setIsMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              isActive('/messages')
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-glow" 
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground"
            )}
          >
            <MessageCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
            {!isCollapsed && <span className="font-medium">Messages</span>}
          </Link>
        )}

        {/* Info Section */}
        <div className="space-y-1 pt-4">
          {!isCollapsed && (
            <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Info
            </p>
          )}
          {infoNavItems.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* Support Us */}
        <Link
          to="/get-started"
          onClick={() => setIsMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground transition-all"
        >
          <Heart className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">Support Us</span>}
        </Link>

        {/* Language */}
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground transition-all w-full">
          <Globe className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">EN</span>}
        </button>

        {/* User Section */}
        {loading ? (
          <div className="h-12 bg-sidebar-accent/20 animate-pulse rounded-lg" />
        ) : user ? (
          <>
            {user && !isCollapsed && <NotificationCenter />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground transition-all w-full">
                  <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                    <User className="w-4 h-4 text-sidebar-accent-foreground" />
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium truncate">{user.email.split('@')[0]}</p>
                      <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/profile-review" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    View Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile-setup" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Edit Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/subscription-plans" className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Subscription Plans
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="space-y-2">
            <Link to="/auth" onClick={() => setIsMobileOpen(false)}>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/20",
                  isCollapsed && "px-2"
                )}
              >
                {isCollapsed ? <User className="w-4 h-4" /> : 'Sign In'}
              </Button>
            </Link>
            {showGetStarted && !isCollapsed && (
              <Link to="/get-started" onClick={() => setIsMobileOpen(false)}>
                <Button 
                  size="sm" 
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Collapse Toggle (Desktop) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex items-center justify-center w-full py-2 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          <Menu className={cn("w-5 h-5 transition-transform", isCollapsed && "rotate-180")} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground shadow-lg"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 h-screen bg-sidebar text-sidebar-foreground z-40 transition-all duration-300 flex-shrink-0",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default AppSidebar;
