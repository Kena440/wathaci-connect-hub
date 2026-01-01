import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import Footer from './Footer';
import CisoAssistant from './CisoAssistant';
import NotificationPermissionBanner from './NotificationPermissionBanner';

interface AppLayoutProps {
  children?: ReactNode;
  showFooter?: boolean;
}

export const AppLayout = ({ children, showFooter = true }: AppLayoutProps) => {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1">
          {children}
        </main>
        {showFooter && <Footer />}
      </div>
      <CisoAssistant />
      <NotificationPermissionBanner />
    </div>
  );
};

export default AppLayout;