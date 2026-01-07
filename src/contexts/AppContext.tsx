import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';

/**
 * AppContext - manages sidebar state and other app-level UI concerns.
 * 
 * NOTE: Auth state is managed by AuthContext. Do NOT add auth listeners here
 * to avoid "Multiple GoTrueClient instances" warnings.
 */

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  setSidebarOpen: () => {},
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        setSidebarOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
