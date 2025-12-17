/**
 * AI Content Generator Component
 * Provides AI-powered caption and hashtag generation for social media posts
 */

import { useState } from 'react';
import api from '../lib/api';

export interface AIGenerationOptions {
  platform?: string;
  tone?: 'professional' | 'casual' | 'funny' | 'inspirational' | 'promotional';
  length?: 'short' | 'medium' | 'long';
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  targetAudience?: string;
}

export interface AIGeneratedContent {
  caption: string;
  hashtags: string[];
  alternativeCaptions?: string[];
}

interface AIContentGeneratorProps {
  onContentGenerated: (content: AIGeneratedContent) => void;
  context?: string;
  mediaDescription?: string;
  platform?: string;
}

export default function AIContentGenerator({
  onContentGenerated,
  context = '',
  mediaDescription = '',
  platform = 'twitter',
}: AIContentGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<AIGenerationOptions>({
    platform: platform,
    tone: 'professional',
    length: 'medium',
    includeHashtags: true,
    includeEmojis: true,
    targetAudience: '',
  });
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim() && !mediaDescription && !context) {
      setError('Please provide a description or context for the AI to work with');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await api.post('/ai/generate-caption', {
        prompt: prompt || mediaDescription || context,
        options: {
          ...options,
          platform: platform,
        },
      });

      const content: AIGeneratedContent = {
        caption: response.data.caption,
        hashtags: response.data.hashtags || [],
        alternativeCaptions: response.data.alternatives || [],
      };

      onContentGenerated(content);
      setIsOpen(false);
      setPrompt('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        AI Generate Caption
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">AI Content Generator</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What's your post about? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Describe your post... e.g., 'Announcing our new product launch' or 'Sharing tips about productivity'"
            />
          </div>

          {/* Tone Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tone
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['professional', 'casual', 'funny', 'inspirational', 'promotional'] as const).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setOptions({ ...options, tone })}
                  className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                    options.tone === tone
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400'
                  }`}
                >
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Length Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Length
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['short', 'medium', 'long'] as const).map((length) => (
                <button
                  key={length}
                  type="button"
                  onClick={() => setOptions({ ...options, length })}
                  className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                    options.length === length
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400'
                  }`}
                >
                  {length.charAt(0).toUpperCase() + length.slice(1)}
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {length === 'short' && '< 100 chars'}
                    {length === 'medium' && '100-200 chars'}
                    {length === 'long' && '> 200 chars'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.includeHashtags}
                onChange={(e) => setOptions({ ...options, includeHashtags: e.target.checked })}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                Include hashtags
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.includeEmojis}
                onChange={(e) => setOptions({ ...options, includeEmojis: e.target.checked })}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                Include emojis
              </span>
            </label>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Audience (Optional)
            </label>
            <input
              type="text"
              value={options.targetAudience}
              onChange={(e) => setOptions({ ...options, targetAudience: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Tech entrepreneurs, fitness enthusiasts, small business owners"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
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
                  Generating...
                </span>
              ) : (
                '✨ Generate Content'
              )}
            </button>
          </div>

          {/* Platform Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 The AI will optimize the content for{' '}
              <strong>{platform === 'twitter' ? 'X/Twitter' : platform}</strong> with appropriate
              character limits and best practices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
