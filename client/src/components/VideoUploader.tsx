import { useState, useRef } from 'react';
import { CloudArrowUpIcon, PlayIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';

interface VideoMetadata {
  title: string;
  description: string;
  hashtags: string[];
  cta: string;
  alt_text: string;
}

interface GeoRestrictions {
  type: 'whitelist' | 'blacklist';
  countries: string[];
  message: string;
}

export function VideoUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState<any>(null);

  // Metadata
  const [metadata, setMetadata] = useState<VideoMetadata>({
    title: '',
    description: '',
    hashtags: [],
    cta: '',
    alt_text: '',
  });

  // Geo restrictions
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [geoRestrictions, setGeoRestrictions] = useState<GeoRestrictions>({
    type: 'whitelist',
    countries: [],
    message: 'This content is not available in your region',
  });

  const [hashtagInput, setHashtagInput] = useState('');
  const [countryInput, setCountryInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);

      // Create video preview
      const videoUrl = URL.createObjectURL(selectedFile);
      setPreview(videoUrl);
    }
  };

  const handleUpload = async () => {
    if (!file || !metadata.title) {
      alert('Please select a video and provide a title');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', metadata.title);
      formData.append('description', metadata.description);
      formData.append('quality', 'medium');

      const response = await api.post('/video/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        },
      });

      setUploadedVideo(response.data.post);
      setProcessing(true);

      // Update metadata
      await handleUpdateMetadata(response.data.post.id);

      setProcessing(false);
      alert('Video uploaded and processed successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.response?.data?.error || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateMetadata = async (videoId?: string) => {
    const postId = videoId || uploadedVideo?.id;
    if (!postId) return;

    try {
      await api.put(`/video/${postId}/metadata`, {
        ...metadata,
        geo_restrictions: geoEnabled ? geoRestrictions : null,
      });

      alert('Metadata updated successfully!');
    } catch (error: any) {
      console.error('Metadata update error:', error);
      alert(error.response?.data?.error || 'Failed to update metadata');
    }
  };

  const handlePublish = async () => {
    if (!uploadedVideo) return;

    try {
      const platforms = ['twitter'];
      const response = await api.post(`/video/${uploadedVideo.id}/publish`, {
        platforms,
        accountIds: {}, // Let user select account in production
      });

      alert('Video published successfully!');
      console.log('Publish result:', response.data);
    } catch (error: any) {
      console.error('Publish error:', error);
      alert(error.response?.data?.error || 'Failed to publish video');
    }
  };

  const addHashtag = () => {
    if (hashtagInput && !metadata.hashtags.includes(hashtagInput)) {
      setMetadata({
        ...metadata,
        hashtags: [...metadata.hashtags, hashtagInput.startsWith('#') ? hashtagInput : `#${hashtagInput}`],
      });
      setHashtagInput('');
    }
  };

  const removeHashtag = (tag: string) => {
    setMetadata({
      ...metadata,
      hashtags: metadata.hashtags.filter(t => t !== tag),
    });
  };

  const addCountry = () => {
    if (countryInput && !geoRestrictions.countries.includes(countryInput.toUpperCase())) {
      setGeoRestrictions({
        ...geoRestrictions,
        countries: [...geoRestrictions.countries, countryInput.toUpperCase()],
      });
      setCountryInput('');
    }
  };

  const removeCountry = (country: string) => {
    setGeoRestrictions({
      ...geoRestrictions,
      countries: geoRestrictions.countries.filter(c => c !== country),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Upload Video
        </h2>

        {/* File Upload */}
        <div className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!preview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
            >
              <CloudArrowUpIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Click to select video file</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                MP4, MOV up to 500MB
              </p>
            </button>
          ) : (
            <div className="relative">
              <video
                src={preview}
                controls
                className="w-full rounded-lg"
                style={{ maxHeight: '400px' }}
              />
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute top-2 right-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Metadata Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={metadata.title}
              onChange={e => setMetadata({ ...metadata, title: e.target.value })}
              placeholder="Enter video title"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={metadata.description}
              onChange={e => setMetadata({ ...metadata, description: e.target.value })}
              placeholder="Enter video description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hashtags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={hashtagInput}
                onChange={e => setHashtagInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                placeholder="#hashtag"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={addHashtag}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {metadata.hashtags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm flex items-center gap-1"
                >
                  {tag}
                  <button
                    onClick={() => removeHashtag(tag)}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Call to Action (CTA)
            </label>
            <input
              type="text"
              value={metadata.cta}
              onChange={e => setMetadata({ ...metadata, cta: e.target.value })}
              placeholder="e.g., Watch more at..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Alt Text (Accessibility)
            </label>
            <input
              type="text"
              value={metadata.alt_text}
              onChange={e => setMetadata({ ...metadata, alt_text: e.target.value })}
              placeholder="Describe the video content"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Geo-Restrictions */}
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GlobeAltIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Geographic Restrictions
              </h3>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={geoEnabled}
                onChange={e => setGeoEnabled(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Enable</span>
            </label>
          </div>

          {geoEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={geoRestrictions.type}
                  onChange={e => setGeoRestrictions({ ...geoRestrictions, type: e.target.value as 'whitelist' | 'blacklist' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="whitelist">Whitelist (Only allow these countries)</option>
                  <option value="blacklist">Blacklist (Block these countries)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Countries (ISO codes: US, MX, ES, etc.)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={countryInput}
                    onChange={e => setCountryInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCountry())}
                    placeholder="US"
                    maxLength={2}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={addCountry}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {geoRestrictions.countries.map(country => (
                    <span
                      key={country}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm flex items-center gap-1"
                    >
                      {country}
                      <button
                        onClick={() => removeCountry(country)}
                        className="hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Block Message
                </label>
                <input
                  type="text"
                  value={geoRestrictions.message}
                  onChange={e => setGeoRestrictions({ ...geoRestrictions, message: e.target.value })}
                  placeholder="Message shown to blocked users"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleUpload}
            disabled={!file || uploading || !metadata.title}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {uploading ? 'Uploading...' : processing ? 'Processing...' : 'Upload & Process'}
          </button>

          {uploadedVideo && (
            <button
              onClick={handlePublish}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              Publish Now
            </button>
          )}
        </div>
      </div>

      {/* Upload Result */}
      {uploadedVideo && (
        <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
            ✅ Video Processed Successfully
          </h3>
          <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
            <p>• Compression: {uploadedVideo.compressionRatio?.toFixed(1)}% reduction</p>
            <p>• Duration: {uploadedVideo.metadata?.duration?.toFixed(1)}s</p>
            <p>• Size: {(uploadedVideo.metadata?.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
        </div>
      )}
    </div>
  );
}
