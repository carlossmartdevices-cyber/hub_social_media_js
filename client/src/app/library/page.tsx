'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import {
  Sparkles, Send, Calendar, Trash2, RefreshCw,
  Copy, Check, Clock, Globe, MoreVertical
} from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  content_en: string;
  content_es: string;
  hashtags_en: string[];
  hashtags_es: string[];
  cta_en: string;
  cta_es: string;
  media_url?: string;
  media_type: string;
  ai_prompt: string;
  status: string;
  created_at: string;
  post_count?: number;
  scheduled_count?: number;
}

const PLATFORMS = [
  { id: 'twitter', name: 'X (Twitter)', icon: '𝕏' },
  { id: 'telegram', name: 'Telegram', icon: '✈️' },
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'facebook', name: 'Facebook', icon: '📘' },
];

export default function LibraryPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();

  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<'en' | 'es'>('es');
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('twitter');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [posting, setPosting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
      return;
    }
    fetchLibrary();
  }, [accessToken, router]);

  const fetchLibrary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/library');
      setContent(response.data.content || []);
    } catch (error) {
      console.error('Error fetching library:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async () => {
    if (!prompt.trim()) return;

    try {
      setGenerating(true);
      const response = await api.post('/library/generate', {
        prompt,
        title: prompt.substring(0, 100)
      });

      setContent([response.data.content, ...content]);
      setPrompt('');
      setSelectedItem(response.data.content);
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setGenerating(false);
    }
  };

<<<<<<< HEAD
  const regenerateContent = async (id: string, language?: 'en' | 'es') => {
    try {
      const response = await api.post(`/library/${id}/regenerate`, { language });
      setContent(content.map(c => c.id === id ? response.data.content : c));
      if (selectedItem?.id === id) {
        setSelectedItem(response.data.content);
      }
      if (language) {
        setActiveLanguage(language);
      }
    } catch (error) {
      console.error('Error regenerating:', error);
    }
  };

  const deleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      await api.delete(`/library/${id}`);
      setContent(content.filter(c => c.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const postContent = async () => {
    if (!selectedItem) return;

    try {
      setPosting(true);
      const scheduledAt = scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : null;

      await api.post(`/library/${selectedItem.id}/post`, {
        platform: selectedPlatform,
        language: activeLanguage,
        scheduledAt
      });

      setShowPostModal(false);
      fetchLibrary();
    } catch (error) {
      console.error('Error posting:', error);
    } finally {
      setPosting(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFullPost = (item: ContentItem, lang: 'en' | 'es') => {
    const content = lang === 'es' ? item.content_es : item.content_en;
    const hashtags = lang === 'es' ? item.hashtags_es : item.hashtags_en;
    return `${content}\n\n${hashtags?.map(h => `#${h}`).join(' ') || ''}`;
  };

  if (!accessToken) return null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Content Library
          </h1>
        </div>

        {/* Generate New Content */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 mb-6 border border-purple-200 dark:border-purple-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Generate with Meth Daddy 😈
          </h3>

          <div className="flex gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateContent()}
              placeholder="Describe what you want to promote... (e.g., 'New video session with clouds')"
              className="flex-1 px-4 py-3 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              onClick={generateContent}
              disabled={generating || !prompt.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {generating ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              Generate
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Content List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Saved Content ({content.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : content.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No content yet. Generate your first post!
              </div>
            ) : (
              content.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedItem?.id === item.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {item.content_es?.substring(0, 80)}...
                      </p>
                    </div>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      item.status === 'posted'
                        ? 'bg-green-100 text-green-700'
                        : item.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(item.created_at).toLocaleDateString()}
                    {(item.post_count ?? 0) > 0 && (
                      <span className="text-green-600">• {item.post_count} posted</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Content Preview */}
          <div className="lg:col-span-2">
            {selectedItem ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {selectedItem.title}
                  </h3>
                  <button
                    onClick={() => deleteContent(selectedItem.id)}
                    className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Language Tabs with Regenerate */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <button
                    onClick={() => setActiveLanguage('es')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeLanguage === 'es'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    🇪🇸 Español
                  </button>
                  <button
                    onClick={() => setActiveLanguage('en')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeLanguage === 'en'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    🇺🇸 English
                  </button>

                  <span className="text-gray-300 dark:text-gray-600">|</span>

                  <button
                    onClick={() => regenerateContent(selectedItem.id, 'es')}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    title="Regenerar solo español"
                  >
                    <RefreshCw className="w-4 h-4" />
                    🇪🇸
                  </button>
                  <button
                    onClick={() => regenerateContent(selectedItem.id, 'en')}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    title="Regenerate English only"
                  >
                    <RefreshCw className="w-4 h-4" />
                    🇺🇸
                  </button>
                  <button
                    onClick={() => regenerateContent(selectedItem.id)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    title="Regenerate both languages"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Both
                  </button>

                {/* Content Display */}
                <div className="relative">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap text-gray-900 dark:text-white">
                    {activeLanguage === 'es' ? selectedItem.content_es : selectedItem.content_en}
                  </div>
                  <button
                    onClick={() => copyToClipboard(
                      getFullPost(selectedItem, activeLanguage),
                      `content-${selectedItem.id}`
                    )}
                    className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Copy to clipboard"
                  >
                    {copiedId === `content-${selectedItem.id}` ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>

                {/* Hashtags */}
                <div className="mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Hashtags:</p>
                  <div className="flex flex-wrap gap-2">
                    {(activeLanguage === 'es' ? selectedItem.hashtags_es : selectedItem.hashtags_en)?.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Post Actions */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Post to Platform:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => {
                          setSelectedPlatform(platform.id);
                          setShowPostModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                      >
                        <span>{platform.icon}</span>
                        {platform.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg text-center">
                <Globe className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Select content from the list or generate new content
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Post Modal */}
        {showPostModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Post to {PLATFORMS.find(p => p.id === selectedPlatform)?.name}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveLanguage('es')}
                      className={`flex-1 py-2 rounded-lg ${
                        activeLanguage === 'es'
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      🇪🇸 Spanish
                    </button>
                    <button
                      onClick={() => setActiveLanguage('en')}
                      className={`flex-1 py-2 rounded-lg ${
                        activeLanguage === 'en'
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      🇺🇸 English
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Schedule (optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                    />
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto">
                  {getFullPost(selectedItem, activeLanguage)}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPostModal(false)}
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={postContent}
                  disabled={posting}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {posting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : scheduleDate ? (
                    <>
                      <Calendar className="w-4 h-4" />
                      Schedule
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Post Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
