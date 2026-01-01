import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      const items = (data || []) as NotificationItem[];
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read_at).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnreadCount(0);
  };

  const handleClick = (n: NotificationItem) => {
    markAsRead(n.id);
    const data = n.data || {};
    if (data.route) navigate(data.route as string);
    else if (n.type === 'funding') navigate('/funding');
    else if (n.type === 'message') navigate('/messages');
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-1" />Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BellOff className="h-12 w-12 mb-4" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <Card key={n.id} className={`p-4 cursor-pointer hover:bg-muted/50 ${!n.read_at ? 'bg-primary/5' : ''}`} onClick={() => handleClick(n)}>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{n.body}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read_at && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationCenter;
