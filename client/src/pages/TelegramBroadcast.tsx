import { TelegramBroadcaster } from '../components/TelegramBroadcaster';

export default function TelegramBroadcast() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Telegram Broadcast</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Broadcast videos to your Telegram channels and groups with AI-generated descriptions
        </p>
      </div>

      <TelegramBroadcaster />
    </div>
  );
}
