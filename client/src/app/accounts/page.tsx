'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { useOAuthConfig } from '@/hooks/useOAuthConfig';
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

// Static platform display metadata (icons, colors)
const PLATFORM_DISPLAY: Record<string, { color: string; icon: string }> = {
  twitter: { color: 'bg-black', icon: '𝕏' },
  facebook: { color: 'bg-blue-600', icon: 'f' },
  instagram: { color: 'bg-gradient-to-r from-purple-500 to-pink-500', icon: '📷' },
  linkedin: { color: 'bg-blue-700', icon: 'in' },
  tiktok: { color: 'bg-black', icon: '♪' },
  youtube: { color: 'bg-red-600', icon: '▶' },
  telegram: { color: 'bg-sky-500', icon: '✈' },
};

export default function AccountsPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch OAuth 2.0 configuration
  const { platforms: oauthPlatforms, loading: oauthLoading, isOAuthAvailable } = useOAuthConfig();

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
      return;
    }
    fetchAccounts();

    // Check for OAuth callback params
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const oauthError = urlParams.get('oauth_error');
    const account = urlParams.get('account');

    if (oauthSuccess === 'true') {
      setNotification({
        type: 'success',
        message: account ? `Successfully connected @${account}!` : 'Account connected successfully!',
      });
      // Clear URL params
      window.history.replaceState({}, '', '/accounts');
      // Auto-dismiss after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    } else if (oauthError) {
      setNotification({
        type: 'error',
        message: decodeURIComponent(oauthError),
      });
      // Clear URL params
      window.history.replaceState({}, '', '/accounts');
      // Auto-dismiss after 8 seconds
      setTimeout(() => setNotification(null), 8000);
    }
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
    // Check if OAuth is available for this platform
    if (!isOAuthAvailable(platform)) {
      setNotification({
        type: 'error',
        message: `OAuth connection is not available for ${platform}. Please check server configuration.`,
      });
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    try {
      setConnecting(platform);
      const response = await api.get(`/oauth/${platform}/auth-url`);
      window.location.href = response.data.authUrl;
    } catch (error: any) {
      console.error(`Failed to connect ${platform}:`, error);
      setNotification({
        type: 'error',
        message: error.response?.data?.error || `Failed to connect ${platform}`,
      });
      setTimeout(() => setNotification(null), 5000);
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

  // Combine OAuth platforms with display metadata
  const displayPlatforms = oauthPlatforms.map((oauth) => ({
    id: oauth.id,
    name: oauth.name,
    oauth2Available: oauth.oauth2Available,
    ...PLATFORM_DISPLAY[oauth.id] || { color: 'bg-gray-400', icon: '○' },
  }));

  return (
    <Layout>
      <div className="space-y-6">
        {/* Notification Banner */}
        {notification && (
          <div
            className={`p-4 rounded-lg ${
              notification.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {notification.type === 'success' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <p className="font-medium">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-current opacity-70 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Connected Accounts</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
          </span>
        </div>

        {loading || oauthLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayPlatforms.map((platform) => {
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
                    {platform.oauth2Available ? (
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
                    ) : (
                      <span className="text-xs text-gray-400 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        Not configured
                      </span>
                    )}
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
