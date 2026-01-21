'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Send, Users, MessageCircle, Image, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import ErrorService from '@/services/errorService';

interface Channel {
  id: string;
  name: string;
  username: string;
  memberCount: number;
}

export default function TelegramBroadcastPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
      return;
    }
    fetchChannels();
  }, [accessToken, router]);

  const fetchChannels = async () => {
    try {
      const response = await api.get('/telegram/channels');
      setChannels(response.data);
    } catch (error) {
      ErrorService.report(error, {
        component: 'TelegramBroadcastPage',
        action: 'fetchChannels',
        severity: 'medium'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const selectAll = () => {
    setSelectedChannels(channels.map((c) => c.id));
  };

  const deselectAll = () => {
    setSelectedChannels([]);
  };

  const handleBroadcast = async () => {
    if (!message.trim() || selectedChannels.length === 0) return;

    try {
      setSending(true);
      setResult(null);
      await api.post('/telegram/broadcast', {
        channelIds: selectedChannels,
        message: message.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
      });
      setResult({ success: true, message: 'Broadcast sent successfully!' });
      setMessage('');
      setMediaUrl('');
      setSelectedChannels([]);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.error || 'Failed to send broadcast',
      });
    } finally {
      setSending(false);
    }
  };

  if (!accessToken) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Telegram Broadcast</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Select Channels
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={deselectAll}
                  className="text-sm text-gray-500 hover:text-gray-600"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : channels.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">No channels connected</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Connect your Telegram bot to a channel first
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
                {channels.map((channel) => (
                  <label
                    key={channel.id}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedChannels.includes(channel.id)}
                      onChange={() => toggleChannel(channel.id)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {channel.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{channel.username}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      {channel.memberCount.toLocaleString()}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {selectedChannels.length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedChannels.length} channel{selectedChannels.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>

          {/* Message Composer */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Compose Message
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your broadcast message..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Supports Markdown formatting
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Image className="w-4 h-4 inline mr-1" />
                  Media URL (optional)
                </label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {result && (
                <div
                  className={`p-4 rounded-lg flex items-center gap-3 ${
                    result.success
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  {result.message}
                </div>
              )}

              <button
                onClick={handleBroadcast}
                disabled={sending || !message.trim() || selectedChannels.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Broadcast
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
