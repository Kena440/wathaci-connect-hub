import { MessageCenter } from '@/components/messaging/MessageCenter';

const Messages = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50 py-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Messages
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Connect and communicate with other users on the platform
          </p>
        </div>
        
        <MessageCenter />
      </div>
    </div>
  );
};

export default Messages;