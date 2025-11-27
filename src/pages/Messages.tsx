import { MessageCenter } from '@/components/messaging/MessageCenter';
import AppLayout from '@/components/AppLayout';

const Messages = () => {
  return (
    <AppLayout>
      <div className="relative min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,237,213,0.6),transparent_45%),_radial-gradient(circle_at_80%_0%,rgba(209,250,229,0.7),transparent_40%)]"
        />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Messages</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Connect and communicate with other users on the platform
            </p>
          </div>

          <div className="rounded-2xl bg-white/90 shadow-xl ring-1 ring-orange-100/60 backdrop-blur">
            <MessageCenter />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;