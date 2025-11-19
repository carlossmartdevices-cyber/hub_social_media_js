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

interface TwitterCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export function PlatformAccounts() {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('twitter');
  const [testingAccount, setTestingAccount] = useState<string | null>(null);

  // Form state
  const [accountName, setAccountName] = useState('');
  const [accountIdentifier, setAccountIdentifier] = useState('');
  const [credentials, setCredentials] = useState<TwitterCredentials>({
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    accessTokenSecret: '',
  });

  useEffect(() => {
    fetchAccounts();
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

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post('/platform-accounts', {
        platform: selectedPlatform,
        accountName,
        accountIdentifier,
        credentials,
      });

      // Reset form
      setAccountName('');
      setAccountIdentifier('');
      setCredentials({
        apiKey: '',
        apiSecret: '',
        accessToken: '',
        accessTokenSecret: '',
      });
      setShowAddModal(false);

      // Refresh accounts list
      fetchAccounts();

      alert('Account added successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add account');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) {
      return;
    }

    try {
      await api.delete(`/platform-accounts/${accountId}`);
      fetchAccounts();
      alert('Account deleted successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete account');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Accounts</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage multiple accounts for each social media platform
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add Account
        </button>
      </div>

      {/* Accounts List */}
      <div className="space-y-4">
        {accounts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No accounts configured yet. Click "Add Account" to get started.
          </div>
        ) : (
          accounts.map(account => (
            <div
              key={account.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: platformColors[account.platform] || '#6B7280' }}
                >
                  {account.platform.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {account.account_name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {account.account_identifier} • {account.platform}
                  </p>
                  {account.last_validated && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Last validated: {new Date(account.last_validated).toLocaleString()}
                    </p>
                  )}
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
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50"
                >
                  {testingAccount === account.id ? 'Testing...' : 'Test'}
                </button>

                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                  title="Delete account"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setShowAddModal(false)}
            ></div>

            <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 z-10">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Add Platform Account
              </h3>

              <form onSubmit={handleAddAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Platform
                  </label>
                  <select
                    value={selectedPlatform}
                    onChange={e => setSelectedPlatform(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="twitter">Twitter (X)</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="telegram">Telegram</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account Name (for your reference)
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder="e.g., My Personal Account"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account Identifier (username/handle)
                  </label>
                  <input
                    type="text"
                    value={accountIdentifier}
                    onChange={e => setAccountIdentifier(e.target.value)}
                    placeholder="e.g., @myhandle"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {selectedPlatform === 'twitter' && (
                  <>
                    <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>How to get Twitter credentials:</strong>
                      </p>
                      <ol className="text-sm text-blue-700 dark:text-blue-300 mt-2 list-decimal list-inside space-y-1">
                        <li>Go to <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="underline">developer.twitter.com</a></li>
                        <li>Create or select your app</li>
                        <li>Go to "Keys and tokens" tab</li>
                        <li>Copy all the credentials below</li>
                      </ol>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        API Key (Consumer Key)
                      </label>
                      <input
                        type="text"
                        value={credentials.apiKey}
                        onChange={e => setCredentials({ ...credentials, apiKey: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        API Secret (Consumer Secret)
                      </label>
                      <input
                        type="password"
                        value={credentials.apiSecret}
                        onChange={e => setCredentials({ ...credentials, apiSecret: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Access Token
                      </label>
                      <input
                        type="text"
                        value={credentials.accessToken}
                        onChange={e => setCredentials({ ...credentials, accessToken: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Access Token Secret
                      </label>
                      <input
                        type="password"
                        value={credentials.accessTokenSecret}
                        onChange={e => setCredentials({ ...credentials, accessTokenSecret: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Add Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
