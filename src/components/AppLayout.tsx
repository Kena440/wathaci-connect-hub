import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface AppLayoutProps {
  children?: ReactNode;
  showHomeContent?: boolean;
  showFooter?: boolean;
}

export const AppLayout = ({ children, showHomeContent = false, showFooter = true }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        {showHomeContent ? (
          <>
            {/* Import components only when needed for home page */}
            {children}
          </>
        ) : (
          children
        )}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default AppLayout;
