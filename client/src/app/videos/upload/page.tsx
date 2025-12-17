'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Upload, X, Video, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface UploadedVideo {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;
  thumbnailUrl?: string;
  error?: string;
}

export default function VideoUploadPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const [videos, setVideos] = useState<UploadedVideo[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!accessToken) {
      router.push('/login');
    }
  }, [accessToken, router]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    const videoFiles = files.filter((file) => file.type.startsWith('video/'));
    
    for (const file of videoFiles) {
      const videoId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newVideo: UploadedVideo = {
        id: videoId,
        filename: file.name,
        status: 'uploading',
        progress: 0,
      };
      
      setVideos((prev) => [...prev, newVideo]);
      
      try {
        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', file.name);
        formData.append('description', '');

        const response = await api.post('/video/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setVideos((prev) =>
              prev.map((v) => (v.id === videoId ? { ...v, progress } : v))
            );
          },
        });
        
        setVideos((prev) =>
          prev.map((v) =>
            v.id === videoId
              ? {
                  ...v,
                  status: 'ready',
                  progress: 100,
                  thumbnailUrl: response.data.thumbnailUrl,
                }
              : v
          )
        );
      } catch (error: any) {
        setVideos((prev) =>
          prev.map((v) =>
            v.id === videoId
              ? {
                  ...v,
                  status: 'error',
                  error: error.response?.data?.error || 'Upload failed',
                }
              : v
          )
        );
      }
    }
  };

  const removeVideo = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  if (!accessToken) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Video Upload</h1>

        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*"
            onChange={handleFileInput}
            className="hidden"
          />
          <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            Drag and drop videos here
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            or click to browse
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Select Videos
          </button>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Supported formats: MP4, MOV, AVI, WebM (Max 500MB)
          </p>
        </div>

        {/* Video List */}
        {videos.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Uploaded Videos ({videos.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {videos.map((video) => (
                <div key={video.id} className="p-4 flex items-center gap-4">
                  <div className="w-20 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Video className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {video.filename}
                    </p>
                    {video.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${video.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Uploading... {video.progress}%
                        </p>
                      </div>
                    )}
                    {video.status === 'processing' && (
                      <p className="text-sm text-yellow-500 flex items-center gap-1 mt-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </p>
                    )}
                    {video.status === 'ready' && (
                      <p className="text-sm text-green-500 flex items-center gap-1 mt-1">
                        <CheckCircle className="w-4 h-4" />
                        Ready
                      </p>
                    )}
                    {video.status === 'error' && (
                      <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        {video.error}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeVideo(video.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
