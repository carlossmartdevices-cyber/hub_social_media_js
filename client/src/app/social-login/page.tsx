'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { LogIn, ExternalLink, Loader2, Check, AlertCircle, ArrowRight } from 'lucide-react';

interface PlatformOption {
  id: string;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  features: string[];
}

const SOCIAL_PLATFORMS: PlatformOption[] = [
  {
    id: 'twitter',
    name: 'X (Twitter)',
    description: 'Share videos and engage with your audience in real-time',
    color: 'text-black dark:text-white',
    bgColor: 'bg-black hover:bg-gray-800 dark:hover:bg-gray-900',
    icon: '𝕏',
    features: ['Real-time posting', 'Video sharing', 'Thread support', 'Analytics'],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Post beautiful videos and stories to your followers',
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600',
    icon: '📷',
    features: ['Feed posts', 'Reels', 'Stories', 'IGTV'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Reach your community with engaging video content',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-600 hover:bg-blue-700',
    icon: 'f',
    features: ['Feed posts', 'Groups', 'Pages', 'Live video'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Go viral with short-form video content',
    color: 'text-black dark:text-white',
    bgColor: 'bg-black hover:bg-gray-800 dark:hover:bg-gray-900',
    icon: '♪',
    features: ['Short videos', 'Drafts', 'Scheduled posts', 'Analytics'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Upload and manage your video channel',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-600 hover:bg-red-700',
    icon: '▶',
    features: ['Video uploads', 'Premieres', 'Shorts', 'Live streaming'],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Share professional content with your network',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-700 hover:bg-blue-800',
    icon: 'in',
    features: ['Professional posts', 'Video content', 'Company pages', 'Articles'],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Send videos to your Telegram channels',
    color: 'text-sky-500 dark:text-sky-400',
    bgColor: 'bg-sky-500 hover:bg-sky-600',
    icon: '✈',
    features: ['Channel posts', 'Bot automation', 'Broadcast', 'Groups'],
  },
];

export default function SocialLoginPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
      return;
    }
    fetchConnectedAccounts();

    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const oauthError = urlParams.get('oauth_error');
    const account = urlParams.get('account');

    if (oauthSuccess === 'true') {
      setSuccess(account ? `Successfully connected @${account}!` : 'Account connected successfully!');
      window.history.replaceState({}, '', '/social-login');
      setTimeout(() => setSuccess(null), 5000);
      fetchConnectedAccounts();
    } else if (oauthError) {
      setError(decodeURIComponent(oauthError));
      window.history.replaceState({}, '', '/social-login');
      setTimeout(() => setError(null), 8000);
    }
  }, [accessToken, router]);

  const fetchConnectedAccounts = async () => {
    try {
      const response = await api.get('/platform-accounts');
      const platforms: Set<string> = new Set(response.data.map((acc: any) => acc.platform as string));
      setConnectedAccounts(platforms);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectPlatform = async (platformId: string) => {
    try {
      setConnecting(platformId);
      setError(null);
      const response = await api.get(`/oauth/${platformId}/auth-url`);
      window.location.href = response.data.authUrl;
    } catch (error: any) {
      setError(error.response?.data?.message || `Failed to connect ${platformId}`);
      setConnecting(null);
    }
  };

  if (!accessToken) return null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Connect Your Social Media
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Login to your favorite platforms to start scheduling and publishing videos
          </p>
        </div>

        {/* Notification Banner */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-current opacity-70 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium">{success}</p>
              </div>
              <button
                onClick={() => setSuccess(null)}
                className="text-current opacity-70 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        {!loading && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Connected Accounts</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {connectedAccounts.size} / {SOCIAL_PLATFORMS.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Ready to publish</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {connectedAccounts.size > 0 ? '✓ Active' : 'Connect accounts'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Platform Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {SOCIAL_PLATFORMS.map((platform) => {
              const isConnected = connectedAccounts.has(platform.id);
              const isConnecting = connecting === platform.id;

              return (
                <div
                  key={platform.id}
                  className="group relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 hover:shadow-2xl"
                >
                  {/* Background gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900" />

                  {/* Connection status indicator */}
                  {isConnected && (
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      <Check className="w-3 h-3" />
                      Connected
                    </div>
                  )}

                  <div className="relative p-6 flex flex-col h-full">
                    {/* Platform Icon and Name */}
                    <div className="mb-4">
                      <div
                        className={`w-16 h-16 rounded-xl ${platform.bgColor} flex items-center justify-center text-white text-3xl font-bold transition-transform duration-300 group-hover:scale-110 mb-4`}
                      >
                        {platform.icon}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {platform.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {platform.description}
                      </p>
                    </div>

                    {/* Features List */}
                    <div className="mb-6 flex-grow">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                        Features
                      </p>
                      <ul className="space-y-2">
                        {platform.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Button */}
                    <button
                      onClick={() => connectPlatform(platform.id)}
                      disabled={isConnecting}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                        isConnected
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-default'
                          : `${platform.bgColor} text-white hover:shadow-lg disabled:opacity-70`
                      }`}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : isConnected ? (
                        <>
                          <Check className="w-4 h-4" />
                          Connected
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          Login & Connect
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Next Steps */}
        {!loading && connectedAccounts.size > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🚀</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Ready to create content!
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  You've successfully connected to {connectedAccounts.size} social media platform{connectedAccounts.size !== 1 ? 's' : ''}.
                  Now you can start creating and scheduling amazing video content across all your accounts.
                </p>
                <button
                  onClick={() => router.push('/bulk-upload')}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Start Creating Content
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">🔒</div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Secure Connection</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your credentials are encrypted and never stored in plain text
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">⚡</div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Multi-Account</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect multiple accounts per platform for maximum reach
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">📊</div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Manage All</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Schedule, edit, and manage all your posts from one dashboard
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
