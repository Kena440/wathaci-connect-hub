import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  showIOSInstructions: boolean;
  canPrompt: boolean;
}

const STORAGE_KEY = 'pwa_install_dismissed';
const VISIT_COUNT_KEY = 'pwa_visit_count';
const TIME_SPENT_KEY = 'pwa_time_spent';
const PAGES_VIEWED_KEY = 'pwa_pages_viewed';
const COOLDOWN_DAYS = 14;

export const usePWAInstall = () => {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    showIOSInstructions: false,
    canPrompt: false,
  });

  // Check if running in standalone mode (already installed)
  const isStandalone = () => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  };

  // Check if iOS
  const checkIsIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  };

  // Check engagement criteria
  const checkEngagementCriteria = useCallback(() => {
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
    const timeSpent = parseInt(localStorage.getItem(TIME_SPENT_KEY) || '0', 10);
    const pagesViewed = parseInt(localStorage.getItem(PAGES_VIEWED_KEY) || '0', 10);

    return visitCount >= 2 || timeSpent >= 45 || pagesViewed >= 3;
  }, []);

  // Check if dismissed recently
  const isDismissedRecently = useCallback(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) return false;

    const dismissedDate = new Date(dismissed);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24));

    return daysDiff < COOLDOWN_DAYS;
  }, []);

  // Track visit
  useEffect(() => {
    // Increment visit count
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
    localStorage.setItem(VISIT_COUNT_KEY, String(visitCount + 1));

    // Track time spent
    const startTime = Date.now();
    const interval = setInterval(() => {
      const currentTimeSpent = parseInt(localStorage.getItem(TIME_SPENT_KEY) || '0', 10);
      const sessionTime = Math.floor((Date.now() - startTime) / 1000);
      localStorage.setItem(TIME_SPENT_KEY, String(currentTimeSpent + sessionTime));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Track page views
  useEffect(() => {
    const pagesViewed = parseInt(localStorage.getItem(PAGES_VIEWED_KEY) || '0', 10);
    localStorage.setItem(PAGES_VIEWED_KEY, String(pagesViewed + 1));
  }, []);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      const canShow = !isStandalone() && checkEngagementCriteria() && !isDismissedRecently();
      
      setState(prev => ({
        ...prev,
        isInstallable: true,
        canPrompt: canShow,
      }));
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setState(prev => ({
        ...prev,
        isInstallable: false,
        isInstalled: true,
        canPrompt: false,
      }));
      
      // Track analytics
      trackAnalytics('installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check initial state
    const isIOS = checkIsIOS();
    const installed = isStandalone();
    const canShow = !installed && checkEngagementCriteria() && !isDismissedRecently();

    setState(prev => ({
      ...prev,
      isIOS,
      isInstalled: installed,
      canPrompt: isIOS ? canShow : prev.canPrompt,
    }));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkEngagementCriteria, isDismissedRecently]);

  // Track analytics
  const trackAnalytics = async (eventType: 'prompt_shown' | 'prompt_accepted' | 'prompt_dismissed' | 'installed') => {
    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
      };

      await supabase.from('pwa_analytics').insert({
        user_id: user?.id || null,
        event_type: eventType,
        device_info: deviceInfo,
      });
    } catch (error) {
      console.error('Failed to track PWA analytics:', error);
    }
  };

  // Prompt to install (Android/Chrome)
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    trackAnalytics('prompt_shown');

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        trackAnalytics('prompt_accepted');
        setDeferredPrompt(null);
        setState(prev => ({ ...prev, isInstallable: false, canPrompt: false }));
        return true;
      } else {
        trackAnalytics('prompt_dismissed');
        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
        setState(prev => ({ ...prev, canPrompt: false }));
        return false;
      }
    } catch (error) {
      console.error('Error prompting install:', error);
      return false;
    }
  }, [deferredPrompt, user?.id]);

  // Show iOS instructions
  const showIOSInstructions = useCallback(() => {
    trackAnalytics('prompt_shown');
    setState(prev => ({ ...prev, showIOSInstructions: true }));
  }, [user?.id]);

  // Hide iOS instructions
  const hideIOSInstructions = useCallback(() => {
    setState(prev => ({ ...prev, showIOSInstructions: false }));
  }, []);

  // Dismiss prompt
  const dismissPrompt = useCallback(() => {
    trackAnalytics('prompt_dismissed');
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setState(prev => ({ ...prev, canPrompt: false, showIOSInstructions: false }));
  }, [user?.id]);

  return {
    ...state,
    promptInstall,
    showIOSInstructions,
    hideIOSInstructions,
    dismissPrompt,
  };
};

export default usePWAInstall;
