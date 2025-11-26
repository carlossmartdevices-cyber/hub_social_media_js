import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface TwitterAccount {
  id: string;
  username: string;
  platform: string;
}

interface TelegramChannel {
  id: string;
  title: string;
  chatId: string;
  type: string;
}

interface MultiPlatformPublisherProps {
  postId: string;
  videoMetadata?: {
    title?: string;
    description?: string;
    hashtags?: string[];
  };
  onPublishSuccess?: (results: any) => void;
  onPublishError?: (error: string) => void;
}

export const MultiPlatformPublisher: React.FC<MultiPlatformPublisherProps> = ({
  postId,
  videoMetadata = {},
  onPublishSuccess,
  onPublishError,
}) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [twitterAccounts, setTwitterAccounts] = useState<TwitterAccount[]>([]);
  const [selectedTwitterAccount, setSelectedTwitterAccount] = useState<string>('');
  const [telegramChannels, setTelegramChannels] = useState<TelegramChannel[]>([]);
  const [selectedTelegramChannels, setSelectedTelegramChannels] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishResults, setPublishResults] = useState<any>(null);

  useEffect(() => {
    loadTwitterAccounts();
    loadTelegramChannels();
    generateDefaultCaption();
  }, [videoMetadata]);

  const loadTwitterAccounts = async () => {
    try {
      const response = await api.get('/platform-accounts?platform=twitter');
      if (response.data.success) {
        setTwitterAccounts(response.data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to load Twitter accounts:', error);
    }
  };

  const loadTelegramChannels = async () => {
    try {
      const response = await api.get('/telegram/channels');
      if (response.data.success) {
        setTelegramChannels(response.data.channels || []);
      }
    } catch (error) {
      console.error('Failed to load Telegram channels:', error);
    }
  };

  const generateDefaultCaption = () => {
    const { title, description, hashtags } = videoMetadata;
    let defaultCaption = '';

    if (title) {
      defaultCaption += `${title}\n\n`;
    }

    if (description) {
      defaultCaption += `${description}\n\n`;
    }

    if (hashtags && hashtags.length > 0) {
      defaultCaption += hashtags.join(' ');
    }

    setCaption(defaultCaption.trim());
  };

  const handlePlatformToggle = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleTelegramChannelToggle = (channelId: string) => {
    if (selectedTelegramChannels.includes(channelId)) {
      setSelectedTelegramChannels(selectedTelegramChannels.filter((id) => id !== channelId));
    } else {
      setSelectedTelegramChannels([...selectedTelegramChannels, channelId]);
    }
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      onPublishError?.('Please select at least one platform');
      return;
    }

    if (selectedPlatforms.includes('twitter') && !selectedTwitterAccount) {
      onPublishError?.('Please select a Twitter account');
      return;
    }

    if (selectedPlatforms.includes('telegram') && selectedTelegramChannels.length === 0) {
      onPublishError?.('Please select at least one Telegram channel');
      return;
    }

    setLoading(true);
    setPublishResults(null);

    try {
      const response = await api.post(`/video/${postId}/publish-multi-platform`, {
        platforms: selectedPlatforms,
        twitterAccountId: selectedTwitterAccount || undefined,
        telegramChannelIds: selectedTelegramChannels.length > 0 ? selectedTelegramChannels : undefined,
        caption,
        videoMetadata,
      });

      if (response.data.success) {
        setPublishResults(response.data);
        onPublishSuccess?.(response.data);
      } else {
        onPublishError?.(response.data.error || 'Failed to publish');
      }
    } catch (error: any) {
      console.error('Publish error:', error);
      onPublishError?.(error.response?.data?.error || 'Failed to publish to platforms');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Publish to Multiple Platforms
      </h2>

      {/* Platform Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Select Platforms
        </h3>
        <div className="space-y-3">
          {/* Twitter */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="platform-twitter"
              checked={selectedPlatforms.includes('twitter')}
              onChange={() => handlePlatformToggle('twitter')}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label
              htmlFor="platform-twitter"
              className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                </svg>
                Twitter / X
              </span>
            </label>
          </div>

          {/* Telegram */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="platform-telegram"
              checked={selectedPlatforms.includes('telegram')}
              onChange={() => handlePlatformToggle('telegram')}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label
              htmlFor="platform-telegram"
              className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                </svg>
                Telegram
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Twitter Account Selection */}
      {selectedPlatforms.includes('twitter') && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Select Twitter Account
          </h3>
          {twitterAccounts.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No Twitter accounts connected. Please connect an account in Settings.
            </p>
          ) : (
            <select
              value={selectedTwitterAccount}
              onChange={(e) => setSelectedTwitterAccount(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select an account...</option>
              {twitterAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  @{account.username}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Telegram Channel Selection */}
      {selectedPlatforms.includes('telegram') && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Select Telegram Channels
          </h3>
          {telegramChannels.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No Telegram channels configured. Please add channels in the Telegram page.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {telegramChannels.map((channel) => (
                <div key={channel.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`channel-${channel.id}`}
                    checked={selectedTelegramChannels.includes(channel.id)}
                    onChange={() => handleTelegramChannelToggle(channel.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor={`channel-${channel.id}`}
                    className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                  >
                    {channel.title}
                    <span className="ml-2 text-xs text-gray-500">({channel.type})</span>
                  </label>
                </div>
              ))}
            </div>
          )}
          {selectedTelegramChannels.length > 0 && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Selected: {selectedTelegramChannels.length} channel(s)
            </p>
          )}
        </div>
      )}

      {/* Caption/Content */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Post Caption
          <span className="ml-2 text-xs text-gray-500">
            ({caption.length} characters)
          </span>
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={6}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Enter your post caption with hashtags..."
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          This caption will be used for both platforms. Optimize for engagement!
        </p>
      </div>

      {/* Publish Button */}
      <button
        onClick={handlePublish}
        disabled={loading || selectedPlatforms.length === 0}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
          loading || selectedPlatforms.length === 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Publishing to {selectedPlatforms.length} platform(s)...
          </span>
        ) : (
          `Publish to ${selectedPlatforms.length > 0 ? selectedPlatforms.join(' + ').toUpperCase() : 'Platforms'}`
        )}
      </button>

      {/* Publish Results */}
      {publishResults && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Publish Results
          </h3>

          {publishResults.totalSuccess > 0 && (
            <div className="mb-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <p className="text-green-800 dark:text-green-200 font-medium">
                ✅ Successfully published to {publishResults.totalSuccess} platform(s)
              </p>
            </div>
          )}

          {publishResults.totalFailed > 0 && (
            <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <p className="text-red-800 dark:text-red-200 font-medium">
                ❌ Failed to publish to {publishResults.totalFailed} platform(s)
              </p>
            </div>
          )}

          {/* Individual Platform Results */}
          <div className="space-y-2">
            {publishResults.results?.map((result: any, index: number) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  result.success
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {result.platform}
                  </span>
                  <span className={result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {result.success ? '✓ Success' : '✗ Failed'}
                  </span>
                </div>

                {result.success && result.platformPostId && (
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Post ID: {result.platformPostId}
                  </p>
                )}

                {result.success && result.details?.successCount && (
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Sent to {result.details.successCount} of {result.details.totalChannels} channels
                  </p>
                )}

                {!result.success && result.error && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Error: {result.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
