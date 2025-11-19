import { useState, useRef } from 'react';
import api from '../lib/api';

type BulkStep = 'upload' | 'explanation' | 'metadata-review' | 'goal' | 'post-selection' | 'publish';

interface VideoData {
  file: File;
  preview: string;
  postId?: string;
  uploadProgress: number;
  explanation: string;
  metadata: {
    // Basic metadata
    title: string;
    description: string;
    suggestedHashtags: string[];

    // SEO optimization fields
    seoTitle: string;
    seoDescription: string;
    keywords: string[];
    tags: string[];
    searchTerms: string[];
    voiceSearchQueries: string[];
    category: string;
    targetKeyword: string;
  } | null;
  userGoal: string;
  postVariants: {
    english: { language: 'en'; content: string; hashtags: string[]; cta?: string };
    spanish: { language: 'es'; content: string; hashtags: string[]; cta?: string };
  } | null;
  selectedLanguage: 'en' | 'es' | null;
}

export function BulkVideoUploader() {
  const [currentStep, setCurrentStep] = useState<BulkStep>('upload');
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Handle multiple video file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length > 6) {
      alert('Maximum 6 videos allowed for bulk upload');
      return;
    }

    const newVideos: VideoData[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploadProgress: 0,
      explanation: '',
      metadata: null,
      userGoal: '',
      postVariants: null,
      selectedLanguage: null,
    }));

    setVideos(newVideos);
  };

  // Step 1: Upload all videos
  const handleUploadAll = async () => {
    setIsProcessing(true);

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];

      try {
        const formData = new FormData();
        formData.append('video', video.file);
        formData.append('title', 'Processing...');
        formData.append('description', '');

        const response = await api.post('/video/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 100)
            );

            setVideos((prev) =>
              prev.map((v, idx) =>
                idx === i ? { ...v, uploadProgress: percentCompleted } : v
              )
            );
          },
        });

        if (response.data.success) {
          setVideos((prev) =>
            prev.map((v, idx) =>
              idx === i ? { ...v, postId: response.data.post.id } : v
            )
          );
        }
      } catch (error: any) {
        alert(`Error uploading video ${i + 1}: ${error.response?.data?.error || error.message}`);
      }
    }

    setIsProcessing(false);
    setCurrentStep('explanation');
  };

  // Step 2: Update explanation for a video
  const updateVideoExplanation = (index: number, explanation: string) => {
    setVideos((prev) =>
      prev.map((v, idx) => (idx === index ? { ...v, explanation } : v))
    );
  };

  // Step 2: Generate metadata for all videos
  const handleGenerateAllMetadata = async () => {
    setIsProcessing(true);

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];

      if (!video.explanation.trim()) {
        alert(`Please provide an explanation for video ${i + 1}`);
        setIsProcessing(false);
        return;
      }

      try {
        const response = await api.post('/video/generate-metadata', {
          userExplanation: video.explanation,
          videoFileName: video.file.name,
        });

        if (response.data.success) {
          setVideos((prev) =>
            prev.map((v, idx) =>
              idx === i ? { ...v, metadata: response.data.metadata } : v
            )
          );
        }
      } catch (error: any) {
        alert(`Error generating metadata for video ${i + 1}: ${error.response?.data?.error || error.message}`);
      }
    }

    setIsProcessing(false);
    setCurrentStep('metadata-review');
  };

  // Step 3: Accept all metadata and update posts
  const handleAcceptAllMetadata = async () => {
    setIsProcessing(true);

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];

      if (!video.metadata || !video.postId) continue;

      try {
        await api.put(`/video/${video.postId}/metadata`, {
          title: video.metadata.title,
          description: video.metadata.description,
          hashtags: video.metadata.suggestedHashtags,
        });
      } catch (error: any) {
        alert(`Error updating metadata for video ${i + 1}: ${error.response?.data?.error || error.message}`);
      }
    }

    setIsProcessing(false);
    setCurrentStep('goal');
  };

  // Step 4: Update user goal for a video
  const updateVideoGoal = (index: number, goal: string) => {
    setVideos((prev) =>
      prev.map((v, idx) => (idx === index ? { ...v, userGoal: goal } : v))
    );
  };

  // Step 4: Generate posts for all videos
  const handleGenerateAllPosts = async () => {
    setIsProcessing(true);

    // Prepare bulk request
    const videosData = videos.map((v) => ({
      title: v.metadata?.title || '',
      description: v.metadata?.description || '',
      userGoal: v.userGoal,
    }));

    try {
      const response = await api.post('/video/generate-bulk-posts', {
        videos: videosData,
      });

      if (response.data.success) {
        const allVariants = response.data.variants;

        setVideos((prev) =>
          prev.map((v, idx) => ({
            ...v,
            postVariants: allVariants[idx],
          }))
        );

        setCurrentStep('post-selection');
      }
    } catch (error: any) {
      alert(`Error generating posts: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 5: Select language for a video
  const selectVideoLanguage = (index: number, language: 'en' | 'es') => {
    setVideos((prev) =>
      prev.map((v, idx) => (idx === index ? { ...v, selectedLanguage: language } : v))
    );
  };

  // Step 6: Publish all videos
  const handlePublishAll = async () => {
    setIsProcessing(true);

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];

      if (!video.selectedLanguage || !video.postVariants || !video.postId) {
        alert(`Please select a language for video ${i + 1}`);
        setIsProcessing(false);
        return;
      }

      try {
        const selectedPost = video.postVariants[video.selectedLanguage];

        // Update post with final content
        await api.put(`/video/${video.postId}/metadata`, {
          title: video.metadata?.title,
          description: video.metadata?.description,
          hashtags: selectedPost.hashtags,
          cta: selectedPost.cta,
          language: video.selectedLanguage,
        });

        // Publish
        await api.post(`/video/${video.postId}/publish`, {
          platforms: ['twitter'],
          accountIds: {},
        });
      } catch (error: any) {
        alert(`Error publishing video ${i + 1}: ${error.response?.data?.error || error.message}`);
      }

      // Small delay between publishes to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setIsProcessing(false);
    setPublishSuccess(true);
    setCurrentStep('publish');
  };

  // Reset
  const handleReset = () => {
    setCurrentStep('upload');
    setVideos([]);
    setCurrentVideoIndex(0);
    setPublishSuccess(false);
  };

  return (
    <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { id: 'upload', label: '1. Upload' },
            { id: 'explanation', label: '2. Explain' },
            { id: 'metadata-review', label: '3. Review' },
            { id: 'goal', label: '4. Goals' },
            { id: 'post-selection', label: '5. Select' },
            { id: 'publish', label: '6. Publish' },
          ].map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep === step.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {index + 1}
              </div>
              {index < 5 && <div className="w-12 h-1 bg-gray-200 dark:bg-gray-700 mx-2"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Upload Videos */}
      {currentStep === 'upload' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bulk Upload (Max 6 Videos)
          </h2>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="video/mp4,video/quicktime,video/x-msvideo"
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Select Videos (Max 6)
            </button>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              MP4, MOV, AVI (max 500MB each)
            </p>
          </div>

          {videos.length > 0 && (
            <div className="mt-4 space-y-4">
              <p className="font-semibold text-gray-900 dark:text-white">
                Selected {videos.length} video{videos.length > 1 ? 's' : ''}:
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {videos.map((video, idx) => (
                  <div key={idx} className="border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    <video src={video.preview} className="w-full h-32 object-cover rounded" />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {video.file.name}
                    </p>
                    {video.uploadProgress > 0 && video.uploadProgress < 100 && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-blue-600 h-1 rounded-full"
                            style={{ width: `${video.uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleUploadAll}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full"
              >
                {isProcessing ? 'Uploading...' : 'Upload All Videos'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Explanations */}
      {currentStep === 'explanation' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Explain Each Video
          </h2>

          {videos.map((video, idx) => (
            <div key={idx} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <div className="flex gap-4">
                <video src={video.preview} className="w-32 h-24 object-cover rounded" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white mb-2">
                    Video {idx + 1}: {video.file.name}
                  </p>
                  <textarea
                    value={video.explanation}
                    onChange={(e) => updateVideoExplanation(idx, e.target.value)}
                    placeholder="Explain what this video is about..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleGenerateAllMetadata}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full"
          >
            {isProcessing ? 'Generating Metadata for All Videos...' : 'Generate All Metadata with Grok'}
          </button>
        </div>
      )}

      {/* Step 3: Review Metadata */}
      {currentStep === 'metadata-review' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Review Generated Metadata
          </h2>

          {videos.map((video, idx) => (
            <div key={idx} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <p className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                Video {idx + 1}: {video.file.name}
              </p>

              {video.metadata && (
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Title:
                  </p>
                  <p className="text-gray-800 dark:text-gray-200">{video.metadata.title}</p>

                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
                    Description:
                  </p>
                  <p className="text-gray-800 dark:text-gray-200">{video.metadata.description}</p>

                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
                    Hashtags:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {video.metadata.suggestedHashtags.map((tag, tagIdx) => (
                      <span
                        key={tagIdx}
                        className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={handleAcceptAllMetadata}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full"
          >
            {isProcessing ? 'Saving...' : 'Accept All & Continue'}
          </button>
        </div>
      )}

      {/* Step 4: Goals */}
      {currentStep === 'goal' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Set Goals for Each Video
          </h2>

          {videos.map((video, idx) => (
            <div key={idx} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <p className="font-semibold text-gray-900 dark:text-white mb-2">
                Video {idx + 1}: {video.metadata?.title}
              </p>
              <textarea
                value={video.userGoal}
                onChange={(e) => updateVideoGoal(idx, e.target.value)}
                placeholder="What's your goal for this video? (e.g., increase sales, attract Asian audience)"
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          ))}

          <button
            onClick={handleGenerateAllPosts}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full"
          >
            {isProcessing ? 'Generating Posts for All Videos...' : 'Generate All Posts with Grok'}
          </button>
        </div>
      )}

      {/* Step 5: Post Selection */}
      {currentStep === 'post-selection' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Choose Language for Each Video
            </h2>
            <p className="text-red-600 dark:text-red-400 font-semibold mt-2">
              ⚠️ IMPORTANT: Select ONE language per video to avoid spam detection
            </p>
          </div>

          {videos.map((video, idx) => (
            <div key={idx} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <p className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
                Video {idx + 1}: {video.metadata?.title}
              </p>

              {video.postVariants && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    onClick={() => selectVideoLanguage(idx, 'en')}
                    className={`p-4 rounded-lg border cursor-pointer ${
                      video.selectedLanguage === 'en'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                      English {video.selectedLanguage === 'en' && '✓'}
                    </h4>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {video.postVariants.english.content}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {video.postVariants.english.hashtags.map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    onClick={() => selectVideoLanguage(idx, 'es')}
                    className={`p-4 rounded-lg border cursor-pointer ${
                      video.selectedLanguage === 'es'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                      Español {video.selectedLanguage === 'es' && '✓'}
                    </h4>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {video.postVariants.spanish.content}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {video.postVariants.spanish.hashtags.map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={handlePublishAll}
            disabled={isProcessing || videos.some((v) => !v.selectedLanguage)}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full"
          >
            {isProcessing ? 'Publishing All Videos...' : 'Publish All Videos'}
          </button>
        </div>
      )}

      {/* Step 6: Success */}
      {currentStep === 'publish' && publishSuccess && (
        <div className="text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            All Videos Published Successfully!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {videos.length} video{videos.length > 1 ? 's' : ''} published successfully.
          </p>

          <button
            onClick={handleReset}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold"
          >
            Upload More Videos
          </button>
        </div>
      )}
    </div>
  );
}
