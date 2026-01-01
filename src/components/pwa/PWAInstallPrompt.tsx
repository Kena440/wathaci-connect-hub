import React from 'react';
import { X, Download, Share, Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const PWAInstallPrompt: React.FC = () => {
  const {
    canPrompt,
    isIOS,
    isInstalled,
    isIOSInstructionsOpen,
    promptInstall,
    openIOSInstructions,
    closeIOSInstructions,
    dismissPrompt,
  } = usePWAInstall();

  if (isInstalled || (!canPrompt && !isIOSInstructionsOpen)) {
    return null;
  }

  const handleInstall = () => {
    if (isIOS) {
      openIOSInstructions();
    } else {
      promptInstall();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeIOSInstructions();
    }
  };

  return (
    <>
      {canPrompt && !isIOSInstructionsOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg">
          <Card className="max-w-lg mx-auto p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">Install WATHACI Connect</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Get quicker access and push notifications
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleInstall}>
                    <Download className="w-4 h-4 mr-2" />
                    Install
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismissPrompt}>
                    Not now
                  </Button>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={dismissPrompt}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Dialog open={isIOSInstructionsOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Install on iOS
            </DialogTitle>
            <DialogDescription>
              Follow these steps to add WATHACI Connect to your home screen
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">1</div>
              <div>
                <p className="font-medium">Tap the Share button</p>
                <div className="mt-2 p-3 bg-muted rounded-lg inline-flex items-center gap-2">
                  <Share className="w-5 h-5 text-primary" />
                  <span className="text-sm">Share</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">2</div>
              <div>
                <p className="font-medium">Tap "Add to Home Screen"</p>
                <div className="mt-2 p-3 bg-muted rounded-lg inline-flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  <span className="text-sm">Add to Home Screen</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">3</div>
              <p className="font-medium">Tap "Add" to confirm</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={dismissPrompt}>Maybe later</Button>
            <Button onClick={closeIOSInstructions}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PWAInstallPrompt;
