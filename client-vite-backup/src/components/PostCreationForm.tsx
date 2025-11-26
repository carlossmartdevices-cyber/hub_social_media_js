import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

// Platform options
const PLATFORMS = [
  { id: 'twitter', name: 'Twitter', icon: '🐦', color: 'bg-blue-400' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: 'bg-sky-500' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-pink-500' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-black' },
  { id: 'facebook', name: 'Facebook', icon: '👥', color: 'bg-blue-600' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-700' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'bg-red-600' },
];

interface PostFormData {
  text: string;
  platforms: string[];
  hashtags: string;
  link: string;
  scheduledAt: string;
}

export default function PostCreationForm() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<PostFormData>({
    text: '',
    platforms: [],
    hashtags: '',
    link: '',
    scheduledAt: '',
  });

  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const handleInputChange = (field: keyof PostFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (field === 'text') {
      setCharCount(value.length);
    }
  };

  const togglePlatform = (platformId: string) => {
    if (formData.platforms.includes(platformId)) {
      setFormData({
        ...formData,
        platforms: formData.platforms.filter((p) => p !== platformId),
      });
    } else {
      setFormData({
        ...formData,
        platforms: [...formData.platforms, platformId],
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setMediaFiles([...mediaFiles, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (action: 'draft' | 'publish' | 'schedule') => {
    setError('');
    setLoading(true);

    try {
      // Validate
      if (!formData.text.trim()) {
        throw new Error('Post text is required');
      }

      if (formData.platforms.length === 0) {
        throw new Error('Please select at least one platform');
      }

      if (action === 'schedule' && !formData.scheduledAt) {
        throw new Error('Please select a schedule date and time');
      }

      // Parse hashtags
      const hashtags = formData.hashtags
        .split(/[\s,]+/)
        .filter((tag) => tag.trim())
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

      // Prepare post data
      const postData: any = {
        platforms: formData.platforms,
        content: {
          text: formData.text,
          hashtags: hashtags.length > 0 ? hashtags : undefined,
          link: formData.link || undefined,
        },
      };

      // Add scheduledAt for draft/scheduled posts
      if (action === 'schedule' && formData.scheduledAt) {
        postData.scheduledAt = new Date(formData.scheduledAt).toISOString();
      } else if (action === 'draft') {
        // For drafts, don't set scheduledAt
        postData.scheduledAt = null;
      }

      // Choose endpoint based on action
      let endpoint = '/posts';
      if (action === 'publish') {
        endpoint = '/posts/publish-now';
      }

      const response = await api.post(endpoint, postData);

      // Success! Navigate to posts list
      navigate('/posts');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const getCharLimitColor = () => {
    if (charCount > 280) return 'text-red-600 dark:text-red-400';
    if (charCount > 240) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <h2 className="text-2xl font-bold text-white">Create New Post</h2>
          <p className="text-indigo-100 text-sm mt-1">Share your content across multiple platforms</p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Platforms <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => togglePlatform(platform.id)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    formData.platforms.includes(platform.id)
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-xl">{platform.icon}</span>
                  <span className="font-medium text-sm">{platform.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Post Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Post Content <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs font-medium ${getCharLimitColor()}`}>
                {charCount} characters
              </span>
            </div>
            <textarea
              value={formData.text}
              onChange={(e) => handleInputChange('text', e.target.value)}
              rows={6}
              className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
              placeholder="What's on your mind? Write your post content here..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              💡 Tip: Keep it under 280 characters for Twitter compatibility
            </p>
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hashtags
            </label>
            <input
              type="text"
              value={formData.hashtags}
              onChange={(e) => handleInputChange('hashtags', e.target.value)}
              className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="socialmedia marketing contentcreation"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Separate hashtags with spaces or commas (# symbol is optional)
            </p>
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link (Optional)
            </label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => handleInputChange('link', e.target.value)}
              className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="https://example.com"
            />
          </div>

          {/* Media Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Media Attachments
              </label>
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                Coming Soon
              </span>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-6 py-8 text-center transition-colors opacity-50 cursor-not-allowed"
              >
                <div className="flex flex-col items-center">
                  <svg
                    className="w-12 h-12 text-gray-400 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Media upload coming soon
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Feature requires backend support
                  </span>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Preview uploaded files */}
              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {mediaFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
                    >
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Schedule Post (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave empty to publish immediately or save as draft
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save as Draft
            </button>

            {formData.scheduledAt ? (
              <button
                type="button"
                onClick={() => handleSubmit('schedule')}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Scheduling...
                  </span>
                ) : (
                  '📅 Schedule Post'
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit('publish')}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Publishing...
                  </span>
                ) : (
                  '🚀 Publish Now'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
