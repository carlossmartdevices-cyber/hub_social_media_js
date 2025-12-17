/**
 * Enhanced Post Creation Component
 * Features: Media upload with compression, AI generation, X thread support
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import AIContentGenerator, { AIGeneratedContent } from './AIContentGenerator';
import {
  compressImage,
  formatFileSize,
  shouldCompressFile,
  validateFileType,
  getOptimalCompressionSettings,
} from '../utils/mediaCompression';
import { smartUpload, formatSpeed, formatRemainingTime } from '../utils/chunkedUpload';

// Platform options
const PLATFORMS = [
  { id: 'twitter', name: 'X (Twitter)', icon: '🐦', color: 'bg-blue-400', charLimit: 280 },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: 'bg-sky-500', charLimit: 4096 },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-pink-500', charLimit: 2200 },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-black', charLimit: 2200 },
  { id: 'facebook', name: 'Facebook', icon: '👥', color: 'bg-blue-600', charLimit: 63206 },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-700', charLimit: 3000 },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'bg-red-600', charLimit: 5000 },
];

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
  originalSize: number;
  compressedSize?: number;
  uploadProgress?: number;
  uploaded?: boolean;
  uploadId?: string;
}

interface ThreadPost {
  id: string;
  text: string;
  charCount: number;
}

export default function EnhancedPostCreation() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState('');
  const [link, setLink] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Thread support
  const [isThreadMode, setIsThreadMode] = useState(false);
  const [threadPosts, setThreadPosts] = useState<ThreadPost[]>([
    { id: '1', text: '', charCount: 0 },
  ]);

  // AI Generator
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const selectedPlatform = platforms[0];
  const platformConfig = PLATFORMS.find((p) => p.id === selectedPlatform);
  const charLimit = platformConfig?.charLimit || 280;
  const charCount = text.length;

  const togglePlatform = (platformId: string) => {
    if (platforms.includes(platformId)) {
      setPlatforms(platforms.filter((p) => p !== platformId));
    } else {
      setPlatforms([...platforms, platformId]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const newMediaFiles: MediaFile[] = [];

    for (const file of files) {
      // Validate file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        setError(`File ${file.name} is not a supported media type`);
        continue;
      }

      let processedFile = file;
      let compressedSize = file.size;

      // Compress images if needed
      if (isImage && shouldCompressFile(file, 5)) {
        try {
          const settings = getOptimalCompressionSettings(file.size / 1024 / 1024);
          processedFile = await compressImage(file, settings, (progress) => {
            console.log(`Compressing ${file.name}: ${progress.percent}%`);
          });
          compressedSize = processedFile.size;
        } catch (err) {
          console.error('Compression failed:', err);
          // Use original file if compression fails
        }
      }

      const preview = URL.createObjectURL(processedFile);

      newMediaFiles.push({
        file: processedFile,
        preview,
        type: isImage ? 'image' : 'video',
        originalSize: file.size,
        compressedSize,
        uploadProgress: 0,
        uploaded: false,
      });
    }

    setMediaFiles([...mediaFiles, ...newMediaFiles]);
  };

  const removeFile = (index: number) => {
    const newFiles = [...mediaFiles];
    URL.revokeObjectURL(newFiles[index].preview);
    newFiles.splice(index, 1);
    setMediaFiles(newFiles);
  };

  const handleAIGenerated = (content: AIGeneratedContent) => {
    setText(content.caption);
    if (content.hashtags.length > 0) {
      setHashtags(content.hashtags.join(' '));
    }
  };

  // Thread functions
  const addThreadPost = () => {
    const newPost: ThreadPost = {
      id: `${Date.now()}`,
      text: '',
      charCount: 0,
    };
    setThreadPosts([...threadPosts, newPost]);
  };

  const updateThreadPost = (id: string, text: string) => {
    setThreadPosts(
      threadPosts.map((post) =>
        post.id === id ? { ...post, text, charCount: text.length } : post
      )
    );
  };

  const removeThreadPost = (id: string) => {
    if (threadPosts.length === 1) return;
    setThreadPosts(threadPosts.filter((post) => post.id !== id));
  };

  const handleSubmit = async (action: 'draft' | 'publish' | 'schedule') => {
    setError('');
    setLoading(true);

    try {
      // Validate
      if (!text.trim() && threadPosts.every((p) => !p.text.trim())) {
        throw new Error('Post content is required');
      }

      if (platforms.length === 0) {
        throw new Error('Please select at least one platform');
      }

      if (action === 'schedule' && !scheduledAt) {
        throw new Error('Please select a schedule date and time');
      }

      // Upload media files first if any
      const uploadedMediaIds: string[] = [];
      if (mediaFiles.length > 0) {
        setUploadingMedia(true);

        for (let i = 0; i < mediaFiles.length; i++) {
          const media = mediaFiles[i];

          const result = await smartUpload(media.file, '/posts/upload-media', {
            onProgress: (progress) => {
              setUploadProgress((prev) => ({ ...prev, [i]: progress.percent }));
            },
          });

          if (result.success && result.fileId) {
            uploadedMediaIds.push(result.fileId);
            setMediaFiles((prev) =>
              prev.map((m, idx) => (idx === i ? { ...m, uploaded: true, uploadId: result.fileId } : m))
            );
          } else {
            throw new Error(`Failed to upload ${media.file.name}`);
          }
        }

        setUploadingMedia(false);
      }

      // Parse hashtags
      const parsedHashtags = hashtags
        .split(/[\s,]+/)
        .filter((tag) => tag.trim())
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

      // Prepare post data
      const postData: any = {
        platforms,
        content: {
          text: isThreadMode ? undefined : text,
          thread: isThreadMode ? threadPosts.map((p) => p.text) : undefined,
          hashtags: parsedHashtags.length > 0 ? parsedHashtags : undefined,
          link: link || undefined,
          mediaIds: uploadedMediaIds.length > 0 ? uploadedMediaIds : undefined,
        },
      };

      // Add scheduledAt for draft/scheduled posts
      if (action === 'schedule' && scheduledAt) {
        postData.scheduledAt = new Date(scheduledAt).toISOString();
      } else if (action === 'draft') {
        postData.scheduledAt = null;
      }

      // Choose endpoint based on action
      let endpoint = '/posts';
      if (action === 'publish') {
        endpoint = '/posts/publish-now';
      }

      await api.post(endpoint, postData);

      // Success! Navigate to posts list
      navigate('/posts');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create post');
    } finally {
      setLoading(false);
      setUploadingMedia(false);
    }
  };

  const getCharLimitColor = () => {
    const percentage = (charCount / charLimit) * 100;
    if (percentage > 100) return 'text-red-600 dark:text-red-400';
    if (percentage > 85) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <h2 className="text-2xl font-bold text-white">Create New Post</h2>
          <p className="text-indigo-100 text-sm mt-1">
            Share your content across multiple platforms with AI assistance
          </p>
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
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all touch-manipulation ${
                    platforms.includes(platform.id)
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

          {/* Thread Mode Toggle for Twitter */}
          {platforms.includes('twitter') && (
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Twitter Thread Mode
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Create a multi-tweet thread
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsThreadMode(!isThreadMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isThreadMode ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isThreadMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Post Content or Thread */}
          {isThreadMode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Thread Posts <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addThreadPost}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  + Add Tweet
                </button>
              </div>
              {threadPosts.map((post, index) => (
                <div key={post.id} className="relative">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={post.text}
                        onChange={(e) => updateThreadPost(post.id, e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder={`Tweet ${index + 1}...`}
                      />
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs font-medium ${getCharLimitColor()}`}>
                          {post.charCount} / {charLimit}
                        </span>
                        {threadPosts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeThreadPost(post.id)}
                            className="text-xs text-red-600 dark:text-red-400 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Post Content <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${getCharLimitColor()}`}>
                    {charCount} / {charLimit} characters
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAIGenerator(true)}
                    className="text-xs px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all"
                  >
                    ✨ AI
                  </button>
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="What's on your mind? Write your post content here..."
              />
            </div>
          )}

          {/* Hashtags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hashtags
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="socialmedia marketing contentcreation"
            />
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link (Optional)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://example.com"
            />
          </div>

          {/* Media Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Media Attachments
            </label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-6 py-8 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
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
                    Click to upload images or videos
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Images will be automatically compressed for optimal performance
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
                  {mediaFiles.map((media, index) => (
                    <div
                      key={index}
                      className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600"
                    >
                      {media.type === 'image' ? (
                        <img
                          src={media.preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video src={media.preview} className="w-full h-full object-cover" />
                      )}

                      {/* Compression Badge */}
                      {media.compressedSize && media.compressedSize < media.originalSize && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          -{Math.round(((media.originalSize - media.compressedSize) / media.originalSize) * 100)}%
                        </div>
                      )}

                      {/* Upload Progress */}
                      {uploadProgress[index] !== undefined && uploadProgress[index] < 100 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <div className="text-white text-sm font-medium">
                            {uploadProgress[index]}%
                          </div>
                        </div>
                      )}

                      {/* Uploaded Badge */}
                      {media.uploaded && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Remove Button */}
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

                      {/* File Size */}
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {formatFileSize(media.compressedSize || media.originalSize)}
                      </div>
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
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              disabled={loading || uploadingMedia}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save as Draft
            </button>

            {scheduledAt ? (
              <button
                type="button"
                onClick={() => handleSubmit('schedule')}
                disabled={loading || uploadingMedia}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Scheduling...' : '📅 Schedule Post'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit('publish')}
                disabled={loading || uploadingMedia}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingMedia
                  ? 'Uploading Media...'
                  : loading
                  ? 'Publishing...'
                  : '🚀 Publish Now'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Content Generator Modal */}
      {showAIGenerator && (
        <AIContentGenerator
          onContentGenerated={handleAIGenerated}
          platform={selectedPlatform}
          context={text}
        />
      )}
    </div>
  );
}
