'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { 
  Sparkles, Send, Calendar, Clock, X, 
  RefreshCw, Wand2, Languages, Upload
} from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  maxLength: number;
}

const PLATFORMS: Platform[] = [
  { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', color: 'bg-black', maxLength: 280 },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'bg-gradient-to-r from-purple-500 to-pink-500', maxLength: 2200 },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-700', maxLength: 3000 },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-600', maxLength: 5000 },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: 'bg-sky-500', maxLength: 4096 },
];

export default function CreatePostPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  
  // Form state
  const [content, setContent] = useState('');
  const [contentEs, setContentEs] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['twitter']);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  
  // Scheduling
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [tone, setTone] = useState<'professional' | 'casual' | 'funny' | 'inspirational'>('professional');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'en' | 'es'>('en');

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
    }
  }, [accessToken, router]);

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleAddHashtag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = hashtagInput.trim().replace(/^#/, '');
      if (tag && !hashtags.includes(tag)) {
        setHashtags([...hashtags, tag]);
      }
      setHashtagInput('');
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter(h => h !== tag));
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + mediaFiles.length > 4) {
      setError('Maximum 4 media files allowed');
      return;
    }
    
    setMediaFiles([...mediaFiles, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    setMediaPreviews(mediaPreviews.filter((_, i) => i !== index));
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      setError('Please describe what you want to post');
      return;
    }

    setAiLoading(true);
    setError('');

    try {
      const response = await api.post('/ai/generate-post-variants', {
        title: aiPrompt,
        description: aiPrompt,
        goal: `Create a ${tone} post for social media`,
        targetAudience: 'general audience'
      });

      setContent(response.data.english.content);
      setContentEs(response.data.spanish.content);
      setHashtags([...response.data.english.hashtags, ...response.data.spanish.hashtags.slice(0, 2)]);
    } catch (err) {
      console.error('AI generation error:', err);
      setError('Failed to generate content with AI');
    } finally {
      setAiLoading(false);
    }
  };

  const regenerateContent = async () => {
    setAiLoading(true);
    try {
      const response = await api.post('/ai/generate-caption', {
        prompt: aiPrompt || content,
        options: {
          platform: selectedPlatforms[0] || 'twitter',
          tone,
          includeHashtags: true,
          includeEmojis: true
        }
      });

      if (activeTab === 'en') {
        setContent(response.data.caption);
      } else {
        setContentEs(response.data.caption);
      }
      
      if (response.data.hashtags) {
        setHashtags(prev => [...new Set([...prev, ...response.data.hashtags])]);
      }
    } catch (err) {
      setError('Failed to regenerate content');
    } finally {
      setAiLoading(false);
    }
  };

  const translateContent = async () => {
    setAiLoading(true);
    try {
      const sourceContent = activeTab === 'en' ? content : contentEs;
      const fromLang = activeTab === 'en' ? 'en' : 'es';
      const toLang = activeTab === 'en' ? 'es' : 'en';

      const response = await api.post('/ai/translate', {
        content: sourceContent,
        fromLang,
        toLang,
        context: 'social_media'
      });

      if (toLang === 'es') {
        setContentEs(response.data.improved);
      } else {
        setContent(response.data.improved);
      }
    } catch (err) {
      setError('Failed to translate content');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('contentEs', contentEs);
      formData.append('platforms', JSON.stringify(selectedPlatforms));
      formData.append('hashtags', JSON.stringify(hashtags));
      
      if (scheduleMode === 'schedule' && scheduledDate && scheduledTime) {
        formData.append('scheduledAt', new Date(`${scheduledDate}T${scheduledTime}`).toISOString());
      }

      mediaFiles.forEach(file => {
        formData.append('media', file);
      });

      await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(scheduleMode === 'schedule' ? 'Post scheduled successfully!' : 'Post created successfully!');
      
      setTimeout(() => {
        router.push('/posts');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  if (!accessToken) return null;

  const currentContent = activeTab === 'en' ? content : contentEs;
  const setCurrentContent = activeTab === 'en' ? setContent : setContentEs;
  const maxLength = Math.min(...selectedPlatforms.map(p => PLATFORMS.find(pl => pl.id === p)?.maxLength || 280));

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Post</h1>
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-5 h-5" />
            AI Assistant
          </button>
        </div>

        {/* AI Panel */}
        {showAiPanel && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 mb-6 border border-purple-200 dark:border-purple-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-500" />
              Generate with PNP 🤖
            </h3>
            
            <div className="space-y-4">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe what you want to post about... (e.g., 'Announce our new product launch with excitement')"
                className="w-full px-4 py-3 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
              
              <div className="flex flex-wrap gap-3">
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as any)}
                  className="px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="funny">Funny</option>
                  <option value="inspirational">Inspirational</option>
                </select>

                <button
                  onClick={generateWithAI}
                  disabled={aiLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Generate EN + ES
                </button>

                <button
                  onClick={regenerateContent}
                  disabled={aiLoading || !content}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>

                <button
                  onClick={translateContent}
                  disabled={aiLoading || !currentContent}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Languages className="w-4 h-4" />
                  Translate
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Platforms</h3>
            <div className="flex flex-wrap gap-3">
              {PLATFORMS.map(platform => (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handlePlatformToggle(platform.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                    selectedPlatforms.includes(platform.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <span>{platform.icon}</span>
                  {platform.name}
                </button>
              ))}
            </div>
          </div>

          {/* Content Editor */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            {/* Language Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('en')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'en'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                🇺🇸 English
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('es')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'es'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                🇪🇸 Español
              </button>
            </div>

            <textarea
              value={currentContent}
              onChange={(e) => setCurrentContent(e.target.value)}
              placeholder={activeTab === 'en' ? "What's on your mind?" : "¿Qué tienes en mente?"}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
              rows={5}
            />
            
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className={currentContent.length > maxLength ? 'text-red-500' : 'text-gray-500'}>
                {currentContent.length} / {maxLength}
              </span>
            </div>
          </div>

          {/* Hashtags */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Hashtags</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {hashtags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveHashtag(tag)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={handleAddHashtag}
              placeholder="Add hashtag (press Enter)"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Media Upload */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Media</h3>
            
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {mediaFiles.length < 4 && (
              <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500">Drop files or click to upload</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Scheduling */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">When to Post</h3>
            
            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => setScheduleMode('now')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  scheduleMode === 'now'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'border-gray-200 dark:border-gray-600'
                }`}
              >
                <Send className="w-4 h-4" />
                Post Now
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('schedule')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  scheduleMode === 'schedule'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Schedule
              </button>
            </div>

            {scheduleMode === 'schedule' && (
              <div className="flex gap-3">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !content || selectedPlatforms.length === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : scheduleMode === 'schedule' ? (
              <>
                <Calendar className="w-5 h-5" />
                Schedule Post
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Publish Now
              </>
            )}
          </button>
        </form>
      </div>
    </Layout>
  );
}
