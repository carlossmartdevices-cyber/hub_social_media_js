import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';

interface PlatformAccount {
  id: string;
  platform: string;
  account_name: string;
  account_identifier: string;
  is_active: boolean;
  last_validated: string | null;
  created_at: string;
}

export function PlatformAccountsOAuth() {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingAccount, setTestingAccount] = useState<string | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState(false);

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
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthError) {
      alert(`❌ Failed to connect account: ${oauthError}`);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/platform-accounts');
      setAccounts(response.data.accounts);
    } catch (error: any) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectTwitter = async () => {
    try {
      setConnectingPlatform(true);

      // Get OAuth authorization URL
      const response = await api.get('/oauth/twitter/authorize', {
        params: {
          returnUrl: window.location.pathname,
        },
      });

      // Redirect to Twitter for authorization
      window.location.href = response.data.authUrl;
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to start OAuth flow');
      setConnectingPlatform(false);
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
      fetchAccounts(); // Refresh to update last_validated
    } catch (error: any) {
      alert(`❌ ${error.response?.data?.error || 'Credentials test failed'}`);
    } finally {
      setTestingAccount(null);
    }
  };

  const platformColors: Record<string, string> = {
    twitter: '#1DA1F2',
    instagram: '#E4405F',
    facebook: '#4267B2',
    linkedin: '#0077B5',
    telegram: '#0088CC',
  };

  const platformNames: Record<string, string> = {
    twitter: 'Twitter (X)',
    instagram: 'Instagram',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    telegram: 'Telegram',
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Connected Accounts</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Connect multiple accounts for each social media platform. Click "Connect" to authorize via OAuth.
        </p>
      </div>

      {/* Quick Connect Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Connect
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={handleConnectTwitter}
            disabled={connectingPlatform}
            className="flex items-center gap-3 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors disabled:opacity-50"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: platformColors.twitter }}
            >
              𝕏
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900 dark:text-white">Twitter (X)</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {connectingPlatform ? 'Connecting...' : 'Connect via OAuth 2.0'}
              </div>
            </div>
          </button>

          {/* Add more platforms here */}
          <div className="flex items-center gap-3 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg opacity-50">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: platformColors.instagram }}
            >
              📷
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900 dark:text-white">Instagram</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Coming soon</div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg opacity-50">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: platformColors.facebook }}
            >
              f
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900 dark:text-white">Facebook</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Coming soon</div>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Your Connected Accounts ({accounts.length})
        </h3>

        <div className="space-y-4">
          {accounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No accounts connected yet. Click "Connect" above to get started.
            </div>
          ) : (
            accounts.map(account => (
              <div
                key={account.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: platformColors[account.platform] || '#6B7280' }}
                  >
                    {account.platform === 'twitter' ? '𝕏' : account.platform.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {account.account_name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {account.account_identifier}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {platformNames[account.platform] || account.platform}
                      {account.last_validated && (
                        <> • Last verified: {new Date(account.last_validated).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {account.is_active ? (
                    <CheckCircleIcon className="h-6 w-6 text-green-500" title="Active" />
                  ) : (
                    <XCircleIcon className="h-6 w-6 text-gray-400" title="Inactive" />
                  )}

                  <button
                    onClick={() => handleTestAccount(account.id)}
                    disabled={testingAccount === account.id}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors"
                  >
                    {testingAccount === account.id ? 'Testing...' : 'Test'}
                  </button>

                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                    title="Disconnect account"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          ℹ️ How it works
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Click "Connect" for any platform</li>
          <li>• You'll be redirected to authorize the connection</li>
          <li>• After authorization, the account will be saved securely</li>
          <li>• You can connect multiple accounts for the same platform</li>
          <li>• When creating a post, you'll be able to select which account to use</li>
        </ul>
      </div>
    </div>
  );
}
