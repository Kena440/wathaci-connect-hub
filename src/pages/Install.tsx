import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Monitor, CheckCircle2, Share, MoreVertical } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import wathciLogo from '@/assets/wathaci-logo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const renderIOSInstructions = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Install on iPhone/iPad</h3>
      <ol className="space-y-3 text-muted-foreground">
        <li className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</span>
          <span>Tap the <Share className="inline w-4 h-4 mx-1" /> Share button in your browser</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</span>
          <span>Scroll down and tap "Add to Home Screen"</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</span>
          <span>Tap "Add" to install WATHACI Connect</span>
        </li>
      </ol>
    </div>
  );

  const renderAndroidInstructions = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Install on Android</h3>
      {isInstallable ? (
        <Button onClick={handleInstallClick} size="lg" className="w-full">
          <Download className="mr-2 h-5 w-5" />
          Install WATHACI Connect
        </Button>
      ) : (
        <ol className="space-y-3 text-muted-foreground">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</span>
            <span>Tap the <MoreVertical className="inline w-4 h-4 mx-1" /> menu button in Chrome</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</span>
            <span>Tap "Add to Home screen" or "Install app"</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</span>
            <span>Tap "Install" to add WATHACI Connect</span>
          </li>
        </ol>
      )}
    </div>
  );

  const renderDesktopInstructions = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Install on Desktop</h3>
      {isInstallable ? (
        <Button onClick={handleInstallClick} size="lg" className="w-full">
          <Download className="mr-2 h-5 w-5" />
          Install WATHACI Connect
        </Button>
      ) : (
        <ol className="space-y-3 text-muted-foreground">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</span>
            <span>Look for the install icon <Download className="inline w-4 h-4 mx-1" /> in your browser's address bar</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</span>
            <span>Click "Install" when prompted</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</span>
            <span>The app will open in its own window</span>
          </li>
        </ol>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-white rounded-2xl shadow-lg flex items-center justify-center p-3">
              <img src={wathciLogo} alt="WATHACI" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold">Install WATHACI Connect</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Get the full app experience with offline access, faster loading, and push notifications.
            </p>
          </div>

          {/* Installation Status */}
          {isInstalled ? (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-lg">Already Installed!</h3>
                    <p className="text-muted-foreground">
                      WATHACI Connect is installed on your device. Look for it on your home screen.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {platform === 'ios' && <Smartphone className="h-5 w-5" />}
                  {platform === 'android' && <Smartphone className="h-5 w-5" />}
                  {platform === 'desktop' && <Monitor className="h-5 w-5" />}
                  Installation Instructions
                </CardTitle>
                <CardDescription>
                  Follow these steps to install the app on your device
                </CardDescription>
              </CardHeader>
              <CardContent>
                {platform === 'ios' && renderIOSInstructions()}
                {platform === 'android' && renderAndroidInstructions()}
                {platform === 'desktop' && renderDesktopInstructions()}
              </CardContent>
            </Card>
          )}

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Why Install?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Works offline - access your data anytime</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Faster loading and smoother experience</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Quick access from your home screen</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Full-screen experience without browser UI</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Automatic updates in the background</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Install;
