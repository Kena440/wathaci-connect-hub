import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Smartphone, Mail, Zap, Calendar, MessageSquare, Briefcase, BadgeDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

interface NotificationPreferences {
  product_updates: boolean;
  funding_alerts: boolean;
  match_alerts: boolean;
  messages: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
}

export const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    product_updates: true,
    funding_alerts: true,
    match_alerts: true,
    messages: true,
    frequency: 'instant',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setPreferences({
            product_updates: data.product_updates ?? true,
            funding_alerts: data.funding_alerts ?? true,
            match_alerts: data.match_alerts ?? true,
            messages: data.messages ?? true,
            frequency: (data.frequency as 'instant' | 'daily' | 'weekly') ?? 'instant',
          });
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [user]);

  // Save preferences
  const savePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          ...newPreferences,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      setPreferences(prev => ({ ...prev, ...newPreferences }));
      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle toggle change
  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    savePreferences({ [key]: value });
  };

  // Handle frequency change
  const handleFrequencyChange = (value: string) => {
    savePreferences({ frequency: value as 'instant' | 'daily' | 'weekly' });
  };

  // Enable push notifications
  const handleEnablePush = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success('Push notifications enabled!');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive real-time alerts on your device
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSupported ? (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <BellOff className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Push notifications are not supported in this browser
              </p>
            </div>
          ) : permission === 'granted' ? (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 text-green-600 rounded-lg">
              <Bell className="h-5 w-5" />
              <p className="text-sm font-medium">Push notifications are enabled</p>
            </div>
          ) : permission === 'denied' ? (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
              <BellOff className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Push notifications are blocked</p>
                <p className="text-xs mt-1">
                  Enable them in your browser settings to receive alerts
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Enable push notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Get instant alerts for funding opportunities and matches
                  </p>
                </div>
              </div>
              <Button onClick={handleEnablePush}>Enable</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <BadgeDollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <Label htmlFor="funding" className="font-medium">
                  Funding Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  New funding opportunities matching your profile
                </p>
              </div>
            </div>
            <Switch
              id="funding"
              checked={preferences.funding_alerts}
              onCheckedChange={(checked) => handleToggle('funding_alerts', checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <Label htmlFor="matches" className="font-medium">
                  Match Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  New professional or funding matches
                </p>
              </div>
            </div>
            <Switch
              id="matches"
              checked={preferences.match_alerts}
              onCheckedChange={(checked) => handleToggle('match_alerts', checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <Label htmlFor="messages" className="font-medium">
                  Messages
                </Label>
                <p className="text-sm text-muted-foreground">
                  New messages and negotiation updates
                </p>
              </div>
            </div>
            <Switch
              id="messages"
              checked={preferences.messages}
              onCheckedChange={(checked) => handleToggle('messages', checked)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Zap className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <Label htmlFor="updates" className="font-medium">
                  Product Updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  New features and platform announcements
                </p>
              </div>
            </div>
            <Switch
              id="updates"
              checked={preferences.product_updates}
              onCheckedChange={(checked) => handleToggle('product_updates', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Notification Frequency
          </CardTitle>
          <CardDescription>
            How often do you want to receive email digests?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={preferences.frequency}
            onValueChange={handleFrequencyChange}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="instant" id="instant" />
              <Label htmlFor="instant" className="flex-1 cursor-pointer">
                <div className="font-medium">Instant</div>
                <div className="text-sm text-muted-foreground">
                  Get notified immediately for each event
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="daily" id="daily" />
              <Label htmlFor="daily" className="flex-1 cursor-pointer">
                <div className="font-medium">Daily Digest</div>
                <div className="text-sm text-muted-foreground">
                  Receive a summary email once a day
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="weekly" id="weekly" />
              <Label htmlFor="weekly" className="flex-1 cursor-pointer">
                <div className="font-medium">Weekly Digest</div>
                <div className="text-sm text-muted-foreground">
                  Receive a summary email once a week
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
