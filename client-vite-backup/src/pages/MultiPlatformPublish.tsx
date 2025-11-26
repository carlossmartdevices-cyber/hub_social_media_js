import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MultiPlatformPublisher } from '../components/MultiPlatformPublisher';

interface Video {
  id: string;
  content: any;
  media_url: string;
  thumbnail_url: string;
  video_duration: number;
  video_metadata: any;
  status: string;
  platforms: string[];
  created_at: string;
}

export default function MultiPlatformPublish() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishSuccess, setPublishSuccess] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/posts?media_type=video&limit=50');
      if (response.data.success) {
        // Filter to show only ready videos
        const readyVideos = response.data.posts.filter(
          (post: any) => post.processing_status === 'ready'
        );
        setVideos(readyVideos);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishSuccess = (results: any) => {
    setPublishSuccess(true);
    // Reload videos to update their status
    loadVideos();
  };

  const handlePublishError = (error: string) => {
    alert(`Publish Error: ${error}`);
  };

  const handleSelectAnother = () => {
    setSelectedVideo(null);
    setPublishSuccess(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg
              className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
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
            <p className="text-gray-600 dark:text-gray-400">Loading your videos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Multi-Platform Publishing
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Publish your videos to both Twitter and Telegram simultaneously
        </p>
      </div>

      {publishSuccess ? (
        <div className="mb-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
              Published Successfully!
            </h2>
            <p className="text-green-700 dark:text-green-300 mb-4">
              Your video has been published to the selected platforms.
            </p>
            <button
              onClick={handleSelectAnother}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Publish Another Video
            </button>
          </div>
        </div>
      ) : selectedVideo ? (
        <div className="space-y-6">
          {/* Selected Video Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <img
                  src={selectedVideo.thumbnail_url}
                  alt="Video thumbnail"
                  className="w-48 h-32 object-cover rounded-lg"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedVideo.video_metadata?.title || 'Untitled Video'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {selectedVideo.video_metadata?.description ||
                    selectedVideo.content?.description ||
                    'No description'}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>Duration: {formatDuration(selectedVideo.video_duration)}</span>
                  <span>•</span>
                  <span>Uploaded: {formatDate(selectedVideo.created_at)}</span>
                  {selectedVideo.platforms && selectedVideo.platforms.length > 0 && (
                    <>
                      <span>•</span>
                      <span>Previously published to: {selectedVideo.platforms.join(', ')}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={handleSelectAnother}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Multi-Platform Publisher */}
          <MultiPlatformPublisher
            postId={selectedVideo.id}
            videoMetadata={{
              title: selectedVideo.video_metadata?.title || selectedVideo.content?.title,
              description:
                selectedVideo.video_metadata?.description ||
                selectedVideo.content?.description,
              hashtags: selectedVideo.video_metadata?.hashtags || [],
            }}
            onPublishSuccess={handlePublishSuccess}
            onPublishError={handlePublishError}
          />
        </div>
      ) : (
        <div>
          {videos.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Videos Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Upload some videos first before publishing to multiple platforms.
              </p>
              <a
                href="/videos/upload"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Upload Video
              </a>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Select a Video to Publish
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedVideo(video)}
                  >
                    <div className="relative">
                      <img
                        src={video.thumbnail_url}
                        alt="Video thumbnail"
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(video.video_duration)}
                      </div>
                      {video.status === 'published' && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                          Published
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {video.video_metadata?.title || video.content?.title || 'Untitled Video'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                        {video.video_metadata?.description ||
                          video.content?.description ||
                          'No description'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatDate(video.created_at)}</span>
                        {video.platforms && video.platforms.length > 0 && (
                          <span className="flex items-center gap-1">
                            {video.platforms.map((platform) => (
                              <span
                                key={platform}
                                className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded capitalize"
                              >
                                {platform}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
