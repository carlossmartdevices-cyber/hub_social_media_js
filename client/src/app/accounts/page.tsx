'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Plus, Link2, Unlink, ExternalLink, Check, AlertCircle, Loader2 } from 'lucide-react';

interface PlatformAccount {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  isConnected: boolean;
  profileUrl?: string;
  profileImage?: string;
}

const PLATFORMS = [
  { id: 'twitter', name: 'X (Twitter)', color: 'bg-black', icon: '𝕏' },
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-600', icon: 'f' },
  { id: 'instagram', name: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500', icon: '📷' },
  { id: 'linkedin', name: 'LinkedIn', color: 'bg-blue-700', icon: 'in' },
  { id: 'tiktok', name: 'TikTok', color: 'bg-black', icon: '♪' },
  { id: 'youtube', name: 'YouTube', color: 'bg-red-600', icon: '▶' },
  { id: 'telegram', name: 'Telegram', color: 'bg-sky-500', icon: '✈' },
];

export default function AccountsPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
      return;
    }
    fetchAccounts();
  }, [accessToken, router]);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/platform-accounts');
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectPlatform = async (platform: string) => {
    try {
      setConnecting(platform);
      const response = await api.get(`/oauth/${platform}/auth-url`);
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error(`Failed to connect ${platform}:`, error);
      setConnecting(null);
    }
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      setDisconnecting(accountId);
      await api.delete(`/platform-accounts/${accountId}`);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (error) {
      console.error('Failed to disconnect account:', error);
    } finally {
      setDisconnecting(null);
    }
  };

  const getAccountForPlatform = (platformId: string) => {
    return accounts.filter((a) => a.platform === platformId);
  };

  if (!accessToken) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Connected Accounts</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORMS.map((platform) => {
              const platformAccounts = getAccountForPlatform(platform.id);
              const hasAccount = platformAccounts.length > 0;

              return (
                <div
                  key={platform.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center text-white font-bold`}
                    >
                      {platform.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {platform.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {hasAccount
                          ? `${platformAccounts.length} account${platformAccounts.length !== 1 ? 's' : ''} connected`
                          : 'Not connected'}
                      </p>
                    </div>
                    <button
                      onClick={() => connectPlatform(platform.id)}
                      disabled={connecting === platform.id}
                      className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                    >
                      {connecting === platform.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Add
                    </button>
                  </div>

                  {platformAccounts.length > 0 && (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {platformAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="p-4 flex items-center gap-3"
                        >
                          {account.profileImage ? (
                            <img
                              src={account.profileImage}
                              alt={account.accountName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <span className="text-gray-500 dark:text-gray-400">
                                {account.accountName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {account.accountName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              {account.isConnected ? (
                                <>
                                  <Check className="w-3 h-3 text-green-500" />
                                  Connected
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3 text-yellow-500" />
                                  Reconnect needed
                                </>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {account.profileUrl && (
                              <a
                                href={account.profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </a>
                            )}
                            <button
                              onClick={() => disconnectAccount(account.id)}
                              disabled={disconnecting === account.id}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              {disconnecting === account.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Unlink className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
