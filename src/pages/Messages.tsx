import { MessageCenter } from '@/components/messaging/MessageCenter';
import AppLayout from '@/components/AppLayout';
import PageHero from '@/components/PageHero';
import heroMessages from '@/assets/hero-messages.jpg';

const Messages = () => {
  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <PageHero
          title="Messages"
          description="Connect and communicate with other users on the platform"
          backgroundImage={heroMessages}
        />
        
        <div className="max-w-6xl mx-auto px-6 py-8">
          <MessageCenter />
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
