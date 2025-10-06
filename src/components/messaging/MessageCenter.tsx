import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  subject: string;
  content: string;
  read: boolean;
  created_at: string;
  sender: { id: string; full_name: string; avatar_url?: string };
  recipient: { id: string; full_name: string; avatar_url?: string };
}

export const MessageCenter = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [composeForm, setComposeForm] = useState({
    recipient_id: '',
    subject: '',
    content: ''
  });

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const loadMessages = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('messaging-system', {
        body: { action: 'get_messages', user_id: user.id }
      });

      if (error) throw error;
      setMessages(data.messages || []);
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const sendMessage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('messaging-system', {
        body: {
          action: 'send_message',
          sender_id: user.id,
          ...composeForm
        }
      });

      if (error) throw error;

      toast({
        title: "Message sent",
        description: "Your message has been sent successfully."
      });

      setComposeForm({ recipient_id: '', subject: '', content: '' });
      setShowCompose(false);
      loadMessages();
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading messages...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
      <Card className="md:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
          <Button size="sm" onClick={() => setShowCompose(true)}>
            Compose
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedMessage?.id === message.id
                  ? 'bg-primary/10'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedMessage(message)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">
                  {message.sender.full_name}
                </span>
                {!message.read && <Badge variant="secondary">New</Badge>}
              </div>
              <p className="text-sm text-gray-600 truncate">{message.subject}</p>
              <p className="text-xs text-gray-400">
                {new Date(message.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardContent className="p-6">
          {showCompose ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Compose Message</h3>
              <Input
                placeholder="Recipient ID"
                value={composeForm.recipient_id}
                onChange={(e) => setComposeForm(prev => ({
                  ...prev,
                  recipient_id: e.target.value
                }))}
              />
              <Input
                placeholder="Subject"
                value={composeForm.subject}
                onChange={(e) => setComposeForm(prev => ({
                  ...prev,
                  subject: e.target.value
                }))}
              />
              <Textarea
                placeholder="Message content..."
                rows={10}
                value={composeForm.content}
                onChange={(e) => setComposeForm(prev => ({
                  ...prev,
                  content: e.target.value
                }))}
              />
              <div className="flex gap-2">
                <Button onClick={sendMessage}>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
                <Button variant="outline" onClick={() => setShowCompose(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : selectedMessage ? (
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold">{selectedMessage.subject}</h3>
                <p className="text-sm text-gray-600">
                  From: {selectedMessage.sender.full_name}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(selectedMessage.created_at).toLocaleString()}
                </p>
              </div>
              <div className="whitespace-pre-wrap">{selectedMessage.content}</div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a message to view</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};