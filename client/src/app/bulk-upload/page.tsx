'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { ChunkedUploadManager } from '@/lib/chunkedUpload';
import { 
  Upload, X, Image, Video, FileVideo, Check, AlertCircle,
  RefreshCw, Sparkles, Calendar, Clock, Trash2, Eye
} from 'lucide-react';

interface UploadedMedia {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress: number;
  url?: string;
  caption?: string;
  scheduledAt?: string;
}

export default function BulkUploadPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  
  const [mediaItems, setMediaItems] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
    }
  }, [accessToken, router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
    addFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  };

  const addFiles = (files: File[]) => {
    const newItems: UploadedMedia[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      status: 'pending',
      progress: 0,
      caption: '',
      scheduledAt: ''
    }));
    
    setMediaItems(prev => [...prev, ...newItems]);
  };

  const removeMedia = (id: string) => {
    setMediaItems(prev => {
      const item = prev.find(m => m.id === id);
      if (item) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter(m => m.id !== id);
    });
  };

  const updateMedia = (id: string, updates: Partial<UploadedMedia>) => {
    setMediaItems(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const generateCaptionWithAI = async (mediaId: string) => {
    const media = mediaItems.find(m => m.id === mediaId);
    if (!media) return;

    setAiGenerating(mediaId);
    try {
      const response = await api.post('/ai/generate-caption', {
        prompt: `Create a caption for a ${media.type} post`,
        options: {
          platform: 'twitter',
          tone: 'casual',
          includeHashtags: true,
          includeEmojis: true
        }
      });
      
      updateMedia(mediaId, { caption: response.data.caption + '\n\n' + response.data.hashtags.map((h: string) => `#${h}`).join(' ') });
    } catch (err) {
      setError('Failed to generate caption');
    } finally {
      setAiGenerating(null);
    }
  };

  const uploadAllMedia = async () => {
    const pendingItems = mediaItems.filter(m => m.status === 'pending');
    if (pendingItems.length === 0) return;

    setUploading(true);
    setError('');

    for (const item of pendingItems) {
      updateMedia(item.id, { status: 'uploading' });

      try {
        const fileSizeMB = item.file.size / (1024 * 1024);

        if (fileSizeMB > 500) {
          // Use chunked upload for large files
          const manager = new ChunkedUploadManager(item.file, {
            onProgress: (progress) => {
              updateMedia(item.id, { progress });
            },
            onError: (error) => {
              updateMedia(item.id, { status: 'error' });
            },
          });

          const result = await manager.upload();
          updateMedia(item.id, {
            status: 'uploaded',
            url: result.url,
            progress: 100
          });
        } else {
          // Use simple upload for smaller files
          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('type', item.type);

          const response = await api.post('/media/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
              updateMedia(item.id, { progress });
            }
          });

          updateMedia(item.id, {
            status: 'uploaded',
            url: response.data.url,
            progress: 100
          });
        }
      } catch (err: any) {
        updateMedia(item.id, { status: 'error' });
        setError(err.message || 'Upload failed');
      }
    }

    setUploading(false);
    setSuccess('All files uploaded successfully!');
  };

  const scheduleAllPosts = async () => {
    const uploadedItems = mediaItems.filter(m => m.status === 'uploaded' && m.caption && m.scheduledAt);
    
    if (uploadedItems.length === 0) {
      setError('Please add captions and schedule times for uploaded media');
      return;
    }

    setUploading(true);
    setError('');

    try {
      for (const item of uploadedItems) {
        await api.post('/posts', {
          content: { text: item.caption },
          platforms: ['twitter'],
          mediaUrls: [item.url],
          scheduledAt: item.scheduledAt
        });
      }
      
      setSuccess(`${uploadedItems.length} posts scheduled successfully!`);
      setMediaItems([]);
    } catch (err) {
      setError('Failed to schedule posts');
    } finally {
      setUploading(false);
    }
  };

  if (!accessToken) return null;

  const uploadedCount = mediaItems.filter(m => m.status === 'uploaded').length;
  const pendingCount = mediaItems.filter(m => m.status === 'pending').length;
  const readyToSchedule = mediaItems.filter(m => m.status === 'uploaded' && m.caption && m.scheduledAt).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Media Upload</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Upload multiple images and videos for future posts
            </p>
          </div>
          
          <div className="flex gap-3">
            {pendingCount > 0 && (
              <button
                onClick={uploadAllMedia}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload All ({pendingCount})
              </button>
            )}
            
            {readyToSchedule > 0 && (
              <button
                onClick={scheduleAllPosts}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Calendar className="w-4 h-4" />
                Schedule All ({readyToSchedule})
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Files</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mediaItems.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500 dark:text-gray-400">Uploaded</p>
            <p className="text-2xl font-bold text-blue-600">{uploadedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
            <p className="text-sm text-gray-500 dark:text-gray-400">Ready to Schedule</p>
            <p className="text-2xl font-bold text-green-600">{readyToSchedule}</p>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
          }`}
        >
          <div className="flex flex-col items-center">
            <Upload className={`w-12 h-12 mb-4 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Drag and drop your files here
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              or click to browse (images and videos)
            </p>
            <label className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
              Select Files
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 flex items-center gap-2">
            <Check className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Media Grid */}
        {mediaItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaItems.map(media => (
              <div 
                key={media.id} 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
              >
                {/* Preview */}
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
                  {media.type === 'video' ? (
                    <video src={media.preview} className="w-full h-full object-cover" />
                  ) : (
                    <img src={media.preview} alt="" className="w-full h-full object-cover" />
                  )}
                  
                  {/* Status badge */}
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${
                    media.status === 'uploaded' ? 'bg-green-500 text-white' :
                    media.status === 'uploading' ? 'bg-blue-500 text-white' :
                    media.status === 'error' ? 'bg-red-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {media.status === 'uploading' ? `${media.progress}%` : media.status}
                  </div>
                  
                  {/* Type badge */}
                  <div className="absolute top-2 right-2 p-1.5 rounded bg-black/50 text-white">
                    {media.type === 'video' ? <Video className="w-4 h-4" /> : <Image className="w-4 h-4" />}
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={() => removeMedia(media.id)}
                    className="absolute bottom-2 right-2 p-1.5 rounded bg-red-500 text-white hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Details */}
                {media.status === 'uploaded' && (
                  <div className="p-4 space-y-3">
                    {/* Caption */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Caption</label>
                        <button
                          onClick={() => generateCaptionWithAI(media.id)}
                          disabled={aiGenerating === media.id}
                          className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                        >
                          {aiGenerating === media.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          Generate with AI
                        </button>
                      </div>
                      <textarea
                        value={media.caption || ''}
                        onChange={(e) => updateMedia(media.id, { caption: e.target.value })}
                        placeholder="Write a caption..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        rows={3}
                      />
                    </div>
                    
                    {/* Schedule */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                        Schedule
                      </label>
                      <input
                        type="datetime-local"
                        value={media.scheduledAt || ''}
                        onChange={(e) => updateMedia(media.id, { scheduledAt: e.target.value })}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    {/* Ready indicator */}
                    {media.caption && media.scheduledAt && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                        <Check className="w-4 h-4" />
                        Ready to schedule
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
