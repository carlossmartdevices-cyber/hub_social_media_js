import { useState, useEffect } from 'react';
import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationIcon,
  LinkIcon,
  RefreshIcon,
} from '@heroicons/react/24/outline';
import api from '../lib/api';

interface PlatformAccount {
  id: string;
  platform: string;
  accountName: string;
  accountIdentifier: string;
  isActive: boolean;
  isConnected: boolean;
  profileUrl?: string;
  lastValidated: string | null;
  createdAt: string;
}

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  status: 'available' | 'coming_soon' | 'beta';
  oauthAvailable: boolean;
  manualAvailable: boolean;
}

const PLATFORMS: Platform[] = [
  {
    id: 'twitter',
    name: 'Twitter (X)',
    icon: '𝕏',
    color: '#1DA1F2',
    description: 'Connect your Twitter account to post and manage tweets',
    status: 'available',
    oauthAvailable: true,
    manualAvailable: true,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📷',
    color: '#E4405F',
    description: 'Share content with your Instagram followers',
    status: 'coming_soon',
    oauthAvailable: false,
    manualAvailable: false,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'f',
    color: '#4267B2',
    description: 'Manage your Facebook pages and posts',
    status: 'coming_soon',
    oauthAvailable: false,
    manualAvailable: false,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'in',
    color: '#0077B5',
    description: 'Share professional content with your network',
    status: 'coming_soon',
    oauthAvailable: false,
    manualAvailable: false,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    color: '#0088CC',
    description: 'Connect Telegram channels and bots',
    status: 'beta',
    oauthAvailable: false,
    manualAvailable: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '♪',
    color: '#25F4EE',
    description: 'Post and manage your TikTok videos',
    status: 'coming_soon',
    oauthAvailable: false,
    manualAvailable: false,
  },
];

export function PlatformAccountsOAuthEnhanced() {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingAccount, setTestingAccount] = useState<string | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'available'>('overview');
  const [accountsCount, setAccountsCount] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAccounts();

    // Check for OAuth callback result
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth_success');
    const oauthError = params.get('oauth_error');
    const account = params.get('account');

    if (oauthSuccess && account) {
      alert(`✅ Successfully connected Twitter account: ${account}`);
      fetchAccounts();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthError) {
      alert(`❌ Failed to connect account: ${oauthError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/platform-accounts');
      setAccounts(response.data.accounts || response.data);

      // Count accounts by platform
      const counts: Record<string, number> = {};
      response.data.accounts?.forEach((account: PlatformAccount) => {
        counts[account.platform] = (counts[account.platform] || 0) + 1;
      }) || response.data.forEach((account: PlatformAccount) => {
        counts[account.platform] = (counts[account.platform] || 0) + 1;
      });
      setAccountsCount(counts);
    } catch (error: any) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectPlatform = async (platformId: string) => {
    try {
      setConnectingPlatform(platformId);

      const response = await api.get(`/oauth/${platformId}/auth-url`, {
        params: {
          returnUrl: window.location.pathname,
        },
      });

      window.location.href = response.data.authUrl;
    } catch (error: any) {
      alert(error.response?.data?.error || `Failed to connect ${platformId}`);
      setConnectingPlatform(null);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) {
      return;
    }

    try {
      await api.delete(`/platform-accounts/${accountId}`);
      fetchAccounts();
      alert('Account disconnected successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to disconnect account');
    }
  };

  const handleTestAccount = async (accountId: string) => {
    try {
      setTestingAccount(accountId);
      await api.post(`/platform-accounts/${accountId}/test`);
      alert('✅ Credentials are valid!');
      fetchAccounts();
    } catch (error: any) {
      alert(`❌ ${error.response?.data?.error || 'Credentials test failed'}`);
    } finally {
      setTestingAccount(null);
    }
  };

  const accountsByPlatform = accounts.reduce(
    (acc, account) => {
      if (!acc[account.platform]) {
        acc[account.platform] = [];
      }
      acc[account.platform].push(account);
      return acc;
    },
    {} as Record<string, PlatformAccount[]>
  );

  const getPlatform = (platformId: string) => PLATFORMS.find(p => p.id === platformId);
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'beta':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'coming_soon':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Connected Accounts</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Connect multiple accounts across different social media platforms. Your credentials are encrypted and secure.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSelectedTab('overview')}
          className={`px-4 py-2 font-medium transition-colors ${
            selectedTab === 'overview'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Your Accounts ({accounts.length})
        </button>
        <button
          onClick={() => setSelectedTab('available')}
          className={`px-4 py-2 font-medium transition-colors ${
            selectedTab === 'available'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Available Platforms
        </button>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Connection Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Accounts</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{accounts.length}</p>
                </div>
                <LinkIcon className="h-8 w-8 text-indigo-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Accounts</p>
                  <p className="text-3xl font-bold text-green-600">
                    {accounts.filter(a => a.isActive).length}
                  </p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-green-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Platforms</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {Object.keys(accountsByPlatform).length}
                  </p>
                </div>
                <div className="h-8 w-8 text-blue-600 opacity-20">📊</div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Needs Attention</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {accounts.filter(a => !a.isActive).length}
                  </p>
                </div>
                <ExclamationIcon className="h-8 w-8 text-orange-600 opacity-20" />
              </div>
            </div>
          </div>

          {/* Connected Accounts List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {accounts.length === 0 ? 'No Connected Accounts' : 'Your Connected Accounts'}
            </h3>

            {accounts.length === 0 ? (
              <div className="text-center py-12">
                <LinkIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No accounts connected yet. Start by connecting your first platform.
                </p>
                <button
                  onClick={() => setSelectedTab('available')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Connect Platform
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map(account => {
                  const platform = getPlatform(account.platform);
                  if (!platform) return null;

                  return (
                    <div
                      key={account.id}
                      className={`border rounded-lg p-4 transition-all ${
                        account.isActive
                          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                          : 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                            style={{ backgroundColor: platform.color }}
                          >
                            {platform.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {account.accountName}
                              </h4>
                              <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                                {platform.name}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {account.accountIdentifier}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {account.isActive ? (
                                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                  <CheckCircleIcon className="h-4 w-4" />
                                  Active
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                                  <ExclamationIcon className="h-4 w-4" />
                                  Credentials Invalid
                                </span>
                              )}
                              {account.lastValidated && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  • Verified: {new Date(account.lastValidated).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTestAccount(account.id)}
                            disabled={testingAccount === account.id}
                            title="Test connection"
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors disabled:opacity-50"
                          >
                            {testingAccount === account.id ? (
                              <RefreshIcon className="h-5 w-5 animate-spin" />
                            ) : (
                              <RefreshIcon className="h-5 w-5" />
                            )}
                          </button>

                          {account.profileUrl && (
                            <a
                              href={account.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900 rounded transition-colors"
                              title="Visit profile"
                            >
                              <LinkIcon className="h-5 w-5" />
                            </a>
                          )}

                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                            title="Disconnect account"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Available Platforms Tab */}
      {selectedTab === 'available' && (
        <div className="space-y-6">
          {/* Quick Connect Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Available Platforms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PLATFORMS.map(platform => (
                <div
                  key={platform.id}
                  className={`border rounded-lg p-4 transition-all ${
                    platform.status === 'coming_soon'
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:shadow-lg hover:border-indigo-500 dark:hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.icon}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusBadge(platform.status)}`}>
                      {platform.status === 'coming_soon' && 'Coming Soon'}
                      {platform.status === 'beta' && 'Beta'}
                      {platform.status === 'available' && 'Ready'}
                    </span>
                  </div>

                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {platform.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {platform.description}
                  </p>

                  {accountsCount[platform.id] && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-3">
                      {accountsCount[platform.id]} account{accountsCount[platform.id] !== 1 ? 's' : ''} connected
                    </p>
                  )}

                  {platform.status === 'available' && platform.oauthAvailable && (
                    <button
                      onClick={() => handleConnectPlatform(platform.id)}
                      disabled={connectingPlatform === platform.id}
                      className="w-full px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      {connectingPlatform === platform.id ? 'Connecting...' : 'Connect with OAuth'}
                    </button>
                  )}

                  {platform.status === 'coming_soon' && (
                    <button
                      disabled
                      className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-md text-sm font-medium cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  )}

                  {platform.status === 'beta' && !platform.oauthAvailable && (
                    <button
                      disabled
                      className="w-full px-3 py-2 bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-md text-sm font-medium cursor-not-allowed"
                    >
                      Manual Configuration
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Information Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
              ℹ️ How Platform Connection Works
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <li>
                <strong>1. Click Connect:</strong> Select a platform and click the "Connect with OAuth" button
              </li>
              <li>
                <strong>2. Authorize:</strong> You'll be redirected to the platform to authorize access
              </li>
              <li>
                <strong>3. Confirm:</strong> After authorization, you'll return to the app with your account connected
              </li>
              <li>
                <strong>4. Use:</strong> Your account will appear in the connected accounts list
              </li>
              <li>
                <strong>5. Select When Publishing:</strong> When creating a post, choose which account to use
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
