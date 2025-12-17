'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { User, Bell, Shield, Palette, Globe, Save, Check, Trash2, Zap } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function SettingsPage() {
  const { accessToken, user } = useAuthStore();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    language: 'en',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    postSuccess: true,
    postFailure: true,
    analytics: false,
  });
  const [bulkDeletePeriod, setBulkDeletePeriod] = useState('24h');
  const [bulkDeletePlatform, setBulkDeletePlatform] = useState('all');
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [automations, setAutomations] = useState<any[]>([]);
  const [loadingAutomations, setLoadingAutomations] = useState(false);
  const [showNewAutomation, setShowNewAutomation] = useState(false);
  const [newAutomation, setNewAutomation] = useState<{
    name: string;
    type: string;
    platforms: string[];
    config: any;
  }>({
    name: '',
    type: 'auto_reply_mentions',
    platforms: ['twitter'],
    config: { replyMessage: '' },
  });

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
      return;
    }
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        language: 'en',
      });
    }
  }, [accessToken, router, user]);

  useEffect(() => {
    if (activeTab === 'automation' && accessToken) {
      loadAutomations();
    }
  }, [activeTab, accessToken]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/users/profile', profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete all posts from the last ${bulkDeletePeriod}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      const response = await api.delete('/posts/bulk-delete', {
        data: {
          period: bulkDeletePeriod,
          platform: bulkDeletePlatform === 'all' ? undefined : bulkDeletePlatform,
        },
      });
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
      alert(response.data.message || 'Posts deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete posts:', error);
      alert(error.response?.data?.error || 'Failed to delete posts');
    } finally {
      setDeleting(false);
    }
  };

  const loadAutomations = async () => {
    try {
      setLoadingAutomations(true);
      const response = await api.get('/automated-actions');
      setAutomations(response.data.actions || []);
    } catch (error) {
      console.error('Failed to load automations:', error);
    } finally {
      setLoadingAutomations(false);
    }
  };

  const handleCreateAutomation = async () => {
    try {
      await api.post('/automated-actions', newAutomation);
      setShowNewAutomation(false);
      setNewAutomation({
        name: '',
        type: 'auto_reply_mentions',
        platforms: ['twitter'],
        config: { replyMessage: '' },
      });
      loadAutomations();
    } catch (error: any) {
      console.error('Failed to create automation:', error);
      alert(error.response?.data?.error || 'Failed to create automation');
    }
  };

  const handleToggleAutomation = async (id: string) => {
    try {
      await api.patch(`/automated-actions/${id}/toggle`);
      loadAutomations();
    } catch (error) {
      console.error('Failed to toggle automation:', error);
    }
  };

  const handleDeleteAutomation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) {
      return;
    }

    try {
      await api.delete(`/automated-actions/${id}`);
      loadAutomations();
    } catch (error) {
      console.error('Failed to delete automation:', error);
    }
  };

  if (!accessToken) return null;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'bulk-delete', label: 'Bulk Delete', icon: Trash2 },
    { id: 'automation', label: 'Automation', icon: Zap },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tabs */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Language
                    </label>
                    <select
                      value={profile.language}
                      onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Settings</h2>
                <div className="space-y-4">
                  {Object.entries({
                    email: 'Email Notifications',
                    push: 'Push Notifications',
                    postSuccess: 'Post Success Alerts',
                    postFailure: 'Post Failure Alerts',
                    analytics: 'Weekly Analytics Report',
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <span className="text-gray-700 dark:text-gray-300">{label}</span>
                      <button
                        onClick={() => setNotifications({ ...notifications, [key]: !notifications[key as keyof typeof notifications] })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          notifications[key as keyof typeof notifications] ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            notifications[key as keyof typeof notifications] ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      Theme
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            theme === t
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="text-center">
                            <div className={`w-8 h-8 mx-auto mb-2 rounded-full ${
                              t === 'light' ? 'bg-yellow-400' : t === 'dark' ? 'bg-gray-800' : 'bg-gradient-to-r from-yellow-400 to-gray-800'
                            }`} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{t}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security Settings</h2>
                <div className="space-y-4">
                  <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <p className="font-medium text-gray-900 dark:text-white">Change Password</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Update your password</p>
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security</p>
                  </button>
                  <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <p className="font-medium text-gray-900 dark:text-white">Active Sessions</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your active sessions</p>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'bulk-delete' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bulk Delete Posts</h2>
                <p className="text-gray-600 dark:text-gray-400">Delete multiple posts at once based on time period and platform.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time Period
                    </label>
                    <select
                      value={bulkDeletePeriod}
                      onChange={(e) => setBulkDeletePeriod(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="24h">Last 24 hours</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="all">All time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Platform (Optional)
                    </label>
                    <select
                      value={bulkDeletePlatform}
                      onChange={(e) => setBulkDeletePlatform(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All platforms</option>
                      <option value="twitter">Twitter</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube">YouTube</option>
                    </select>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ Warning: This action cannot be undone. All selected posts will be permanently deleted.
                    </p>
                  </div>

                  <button
                    onClick={handleBulkDelete}
                    disabled={deleting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {deleteSuccess ? (
                      <>
                        <Check className="w-5 h-5" />
                        Deleted!
                      </>
                    ) : deleting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5" />
                        Delete Posts
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'automation' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Automated Actions</h2>
                    <p className="text-gray-600 dark:text-gray-400">Configure automated responses and scheduled promotions.</p>
                  </div>
                  <button
                    onClick={() => setShowNewAutomation(true)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                  >
                    + New Automation
                  </button>
                </div>

                {showNewAutomation && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Create New Automation</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={newAutomation.name}
                        onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                        placeholder="e.g., Auto reply to mentions"
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Type
                      </label>
                      <select
                        value={newAutomation.type}
                        onChange={(e) => setNewAutomation({ ...newAutomation, type: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="auto_reply_mentions">Auto Reply to Mentions</option>
                        <option value="auto_reply_inbox">Auto Reply to Inbox</option>
                        <option value="scheduled_promotion">Scheduled Promotion</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Platforms
                      </label>
                      <select
                        multiple
                        value={newAutomation.platforms}
                        onChange={(e) => setNewAutomation({
                          ...newAutomation,
                          platforms: Array.from(e.target.selectedOptions, option => option.value)
                        })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="twitter">Twitter</option>
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                      </select>
                    </div>

                    {(newAutomation.type === 'auto_reply_mentions' || newAutomation.type === 'auto_reply_inbox') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Reply Message
                        </label>
                        <textarea
                          value={newAutomation.config.replyMessage}
                          onChange={(e) => setNewAutomation({
                            ...newAutomation,
                            config: { ...newAutomation.config, replyMessage: e.target.value }
                          })}
                          placeholder="Thank you for your message!"
                          rows={3}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    )}

                    {newAutomation.type === 'scheduled_promotion' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Promotion Message
                          </label>
                          <textarea
                            value={newAutomation.config.message || ''}
                            onChange={(e) => setNewAutomation({
                              ...newAutomation,
                              config: { ...newAutomation.config, message: e.target.value }
                            })}
                            placeholder="Check out our latest offer!"
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Frequency
                          </label>
                          <select
                            value={newAutomation.config.frequency || 'monthly'}
                            onChange={(e) => setNewAutomation({
                              ...newAutomation,
                              config: { ...newAutomation.config, frequency: e.target.value }
                            })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateAutomation}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => setShowNewAutomation(false)}
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {loadingAutomations ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : automations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No automations yet. Create your first one!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {automations.map((automation: any) => (
                      <div
                        key={automation.id}
                        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{automation.name}</h3>
                              <span className={`px-2 py-1 text-xs rounded ${
                                automation.isEnabled
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                              }`}>
                                {automation.isEnabled ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              Type: {automation.type.replace(/_/g, ' ')}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {automation.platforms.map((platform: string) => (
                                <span
                                  key={platform}
                                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded"
                                >
                                  {platform}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleAutomation(automation.id)}
                              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
                            >
                              {automation.isEnabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => handleDeleteAutomation(automation.id)}
                              className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                {saved ? (
                  <>
                    <Check className="w-5 h-5" />
                    Saved!
                  </>
                ) : saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
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
