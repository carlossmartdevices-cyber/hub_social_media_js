import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationIcon,
  ClockIcon,
  LinkIcon,
  RefreshIcon,
  ArrowUpRightIcon,
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

interface PlatformStats {
  platform: string;
  totalAccounts: number;
  activeAccounts: number;
  inactiveAccounts: number;
  lastActivity?: string;
}

export function PlatformConnectionDashboard() {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [stats, setStats] = useState<PlatformStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/platform-accounts');
      const accountsData = response.data.accounts || response.data;
      setAccounts(accountsData);
      calculateStats(accountsData);
    } catch (error: any) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (accountsData: PlatformAccount[]) => {
    const platformMap = new Map<string, PlatformStats>();

    accountsData.forEach(account => {
      if (!platformMap.has(account.platform)) {
        platformMap.set(account.platform, {
          platform: account.platform,
          totalAccounts: 0,
          activeAccounts: 0,
          inactiveAccounts: 0,
        });
      }

      const stat = platformMap.get(account.platform)!;
      stat.totalAccounts++;
      if (account.isActive) {
        stat.activeAccounts++;
      } else {
        stat.inactiveAccounts++;
      }

      // Update last activity
      if (account.lastValidated) {
        if (!stat.lastActivity || new Date(account.lastValidated) > new Date(stat.lastActivity)) {
          stat.lastActivity = account.lastValidated;
        }
      }
    });

    setStats(Array.from(platformMap.values()).sort((a, b) => b.totalAccounts - a.totalAccounts));
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  const getHealthStatus = (stat: PlatformStats) => {
    if (stat.totalAccounts === 0) {
      return { status: 'none', label: 'No Accounts', color: 'gray' };
    }
    if (stat.inactiveAccounts === stat.totalAccounts) {
      return { status: 'critical', label: 'All Inactive', color: 'red' };
    }
    if (stat.inactiveAccounts > 0) {
      return { status: 'warning', label: 'Partially Inactive', color: 'yellow' };
    }
    return { status: 'healthy', label: 'All Active', color: 'green' };
  };

  const getColorClasses = (color: string, type: 'bg' | 'text' | 'border') => {
    const classMap: Record<string, Record<string, string>> = {
      bg: {
        red: 'bg-red-100 dark:bg-red-900',
        yellow: 'bg-yellow-100 dark:bg-yellow-900',
        green: 'bg-green-100 dark:bg-green-900',
        gray: 'bg-gray-100 dark:bg-gray-900',
      },
      text: {
        red: 'text-red-800 dark:text-red-200',
        yellow: 'text-yellow-800 dark:text-yellow-200',
        green: 'text-green-800 dark:text-green-200',
        gray: 'text-gray-800 dark:text-gray-200',
      },
      border: {
        red: 'border-red-200 dark:border-red-700',
        yellow: 'border-yellow-200 dark:border-yellow-700',
        green: 'border-green-200 dark:border-green-700',
        gray: 'border-gray-200 dark:border-gray-700',
      },
    };
    return classMap[type]?.[color] || '';
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      twitter: '𝕏',
      instagram: '📷',
      facebook: 'f',
      linkedin: 'in',
      telegram: '✈️',
      tiktok: '♪',
    };
    return icons[platform] || '📱';
  };

  const getPlatformName = (platform: string) => {
    const names: Record<string, string> = {
      twitter: 'Twitter (X)',
      instagram: 'Instagram',
      facebook: 'Facebook',
      linkedin: 'LinkedIn',
      telegram: 'Telegram',
      tiktok: 'TikTok',
    };
    return names[platform] || platform;
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      twitter: '#1DA1F2',
      instagram: '#E4405F',
      facebook: '#4267B2',
      linkedin: '#0077B5',
      telegram: '#0088CC',
      tiktok: '#25F4EE',
    };
    return colors[platform] || '#6B7280';
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
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Platform Connection Status
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time overview of all your connected platforms
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Refresh status"
        >
          <RefreshIcon className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Connections</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {accounts.length}
              </p>
            </div>
            <LinkIcon className="h-8 w-8 text-indigo-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {accounts.filter(a => a.isActive).length}
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Needs Attention</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {accounts.filter(a => !a.isActive).length}
              </p>
            </div>
            <ExclamationIcon className="h-8 w-8 text-orange-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Platform Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.length === 0 ? (
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <LinkIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No platforms connected yet. Start by connecting your first platform in the Connected Accounts section.
            </p>
          </div>
        ) : (
          stats.map(stat => {
            const health = getHealthStatus(stat);
            const platform = getPlatformName(stat.platform);
            const icon = getPlatformIcon(stat.platform);
            const color = getPlatformColor(stat.platform);

            return (
              <div
                key={stat.platform}
                className={`border rounded-lg p-4 transition-all ${getColorClasses(health.color, 'border')} ${getColorClasses(health.color, 'bg')}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: color }}
                    >
                      {icon}
                    </div>
                    <div>
                      <h4 className={`font-semibold ${getColorClasses(health.color, 'text')}`}>
                        {platform}
                      </h4>
                      <p className={`text-xs ${getColorClasses(health.color, 'text')} opacity-75`}>
                        {health.label}
                      </p>
                    </div>
                  </div>
                  {health.status === 'healthy' && (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  )}
                  {health.status === 'warning' && (
                    <ExclamationIcon className="h-5 w-5 text-yellow-600" />
                  )}
                  {health.status === 'critical' && (
                    <ExclamationIcon className="h-5 w-5 text-red-600" />
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className={getColorClasses(health.color, 'text')}>Active</span>
                    <span className="font-semibold text-green-600">
                      {stat.activeAccounts}/{stat.totalAccounts}
                    </span>
                  </div>

                  {stat.inactiveAccounts > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className={getColorClasses(health.color, 'text')}>Inactive</span>
                      <span className="font-semibold text-red-600">
                        {stat.inactiveAccounts}
                      </span>
                    </div>
                  )}

                  {stat.lastActivity && (
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mt-3">
                      <ClockIcon className="h-3 w-3" />
                      Last activity: {new Date(stat.lastActivity).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {stat.inactiveAccounts > 0 && (
                  <div className="pt-3 border-t border-current opacity-30">
                    <p className="text-xs font-medium">
                      {stat.inactiveAccounts} account{stat.inactiveAccounts !== 1 ? 's' : ''} need attention
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Recent Activity */}
      {accounts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Recent Connections
          </h4>

          <div className="space-y-3">
            {accounts.slice(0, 5).map(account => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: getPlatformColor(account.platform) }}
                  >
                    {getPlatformIcon(account.platform)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {account.accountName}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {getPlatformName(account.platform)} • {account.accountIdentifier}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {account.isActive ? (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-xs rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200 text-xs rounded">
                      Inactive
                    </span>
                  )}
                  <ArrowUpRightIcon className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>

          {accounts.length > 5 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
              And {accounts.length - 5} more account{accounts.length - 5 !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Health Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Keeping Your Connections Healthy
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Check the status regularly to ensure all accounts are active</li>
          <li>• If an account shows as inactive, click "Test" to verify credentials</li>
          <li>• Keep your platform passwords secure to prevent disconnections</li>
          <li>• If you revoke app access on a platform, you'll need to reconnect</li>
          <li>• Some platforms may require periodic re-authentication</li>
        </ul>
      </div>
    </div>
  );
}
