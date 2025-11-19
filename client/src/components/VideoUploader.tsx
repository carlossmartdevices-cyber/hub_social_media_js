import { useState, useRef } from 'react';
import api from '../lib/api';

type Step = 'upload' | 'explanation' | 'metadata-review' | 'goal' | 'post-selection' | 'publish';

interface VideoMetadata {
  title: string;
  description: string;
  suggestedHashtags: string[];
}

interface PostVariant {
  language: 'en' | 'es';
  content: string;
  hashtags: string[];
  cta?: string;
}

interface PostVariants {
  english: PostVariant;
  spanish: PostVariant;
}

export function VideoUploader() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [postId, setPostId] = useState<string>('');

  // Step 2: User explanation
  const [userExplanation, setUserExplanation] = useState('');

  // Step 3: Generated metadata
  const [generatedMetadata, setGeneratedMetadata] = useState<VideoMetadata | null>(null);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);

  // Step 4: User goal
  const [userGoal, setUserGoal] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  // Step 5: Post variants
  const [postVariants, setPostVariants] = useState<PostVariants | null>(null);
  const [previousAttempts, setPreviousAttempts] = useState<PostVariants[]>([]);
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'es' | null>(null);

  // Step 6: Publishing
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Handle video file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  // Step 1: Upload video
  const handleUpload = async () => {
    if (!videoFile) return;

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', 'Processing...');
      formData.append('description', '');

      const response = await api.post('/video/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          );
          setUploadProgress(percentCompleted);
        },
      });

      if (response.data.success) {
        setPostId(response.data.post.id);
        setCurrentStep('explanation');
      }
    } catch (error: any) {
      alert('Error uploading video: ' + (error.response?.data?.error || error.message));
    }
  };

  // Step 2: Generate metadata with Grok
  const handleGenerateMetadata = async () => {
    if (!userExplanation.trim()) {
      alert('Please provide an explanation of what the video is about');
      return;
    }

    setIsGeneratingMetadata(true);
    try {
      const response = await api.post('/video/generate-metadata', {
        userExplanation,
        videoFileName: videoFile?.name || 'video.mp4',
      });

      if (response.data.success) {
        setGeneratedMetadata(response.data.metadata);
        setCurrentStep('metadata-review');
      }
    } catch (error: any) {
      alert('Error generating metadata: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  // Step 3: Regenerate metadata (if user doesn't like it)
  const handleRegenerateMetadata = async () => {
    await handleGenerateMetadata();
  };

  // Step 3: Accept metadata and move to goal step
  const handleAcceptMetadata = async () => {
    if (!generatedMetadata || !postId) return;

    try {
      // Update post with generated metadata
      await api.put(`/video/${postId}/metadata`, {
        title: generatedMetadata.title,
        description: generatedMetadata.description,
        hashtags: generatedMetadata.suggestedHashtags,
      });

      setCurrentStep('goal');
    } catch (error: any) {
      alert('Error updating metadata: ' + (error.response?.data?.error || error.message));
    }
  };

  // Step 4: Generate post variants
  const handleGeneratePosts = async () => {
    if (!userGoal.trim() || !generatedMetadata) {
      alert('Please describe your goal for this post');
      return;
    }

    setIsGeneratingPosts(true);
    try {
      const response = await api.post('/video/generate-posts', {
        videoTitle: generatedMetadata.title,
        videoDescription: generatedMetadata.description,
        userGoal,
        targetAudience: targetAudience || undefined,
      });

      if (response.data.success) {
        setPostVariants(response.data.variants);
        setCurrentStep('post-selection');
      }
    } catch (error: any) {
      alert('Error generating posts: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsGeneratingPosts(false);
    }
  };

  // Step 5: Regenerate posts if user doesn't like them
  const handleRegeneratePosts = async () => {
    if (!generatedMetadata) return;

    if (postVariants) {
      setPreviousAttempts([...previousAttempts, postVariants]);
    }

    setIsGeneratingPosts(true);
    try {
      const response = await api.post('/video/regenerate-posts', {
        videoTitle: generatedMetadata.title,
        videoDescription: generatedMetadata.description,
        userGoal,
        previousAttempts: [...previousAttempts, postVariants].filter(Boolean),
      });

      if (response.data.success) {
        setPostVariants(response.data.variants);
      }
    } catch (error: any) {
      alert('Error regenerating posts: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsGeneratingPosts(false);
    }
  };

  // Step 6: Publish selected post
  const handlePublish = async (scheduled: boolean = false) => {
    if (!selectedLanguage || !postVariants || !postId) {
      alert('Please select a language variant first');
      return;
    }

    setIsPublishing(true);
    try {
      const selectedPost = postVariants[selectedLanguage];

      // Update post with final content
      await api.put(`/video/${postId}/metadata`, {
        title: generatedMetadata?.title,
        description: generatedMetadata?.description,
        hashtags: selectedPost.hashtags,
        cta: selectedPost.cta,
        language: selectedLanguage,
      });

      // Publish or schedule
      const publishData: any = {
        platforms: ['twitter'],
        accountIds: {}, // User should select account
      };

      if (scheduled) {
        // You can add a date picker for this
        publishData.scheduledAt = new Date(Date.now() + 3600000).toISOString();
      }

      await api.post(`/video/${postId}/publish`, publishData);

      setPublishSuccess(true);
      setCurrentStep('publish');
    } catch (error: any) {
      alert('Error publishing post: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsPublishing(false);
    }
  };

  // Reset to upload a new video
  const handleReset = () => {
    setCurrentStep('upload');
    setVideoFile(null);
    setVideoPreview('');
    setUploadProgress(0);
    setPostId('');
    setUserExplanation('');
    setGeneratedMetadata(null);
    setUserGoal('');
    setTargetAudience('');
    setPostVariants(null);
    setPreviousAttempts([]);
    setSelectedLanguage(null);
    setPublishSuccess(false);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { id: 'upload', label: '1. Upload' },
            { id: 'explanation', label: '2. Explain' },
            { id: 'metadata-review', label: '3. Review' },
            { id: 'goal', label: '4. Goal' },
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
              {index < 5 && (
                <div className="w-12 h-1 bg-gray-200 dark:bg-gray-700 mx-2"></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          {[
            'Upload',
            'Explain',
            'Review',
            'Goal',
            'Select',
            'Publish',
          ].map((label) => (
            <div key={label} className="text-xs text-gray-500 dark:text-gray-400 w-20 text-center">
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Upload Video */}
      {currentStep === 'upload' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Step 1: Upload Your Video
          </h2>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="video/mp4,video/quicktime,video/x-msvideo"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Select Video File
            </button>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              MP4, MOV, AVI (max 500MB)
            </p>
          </div>

          {videoPreview && (
            <div className="mt-4">
              <video
                src={videoPreview}
                controls
                className="w-full max-h-96 rounded-lg"
              />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Selected: {videoFile?.name}
              </p>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Uploading: {uploadProgress}%
                  </p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploadProgress > 0 && uploadProgress < 100}
                className="mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full"
              >
                Upload & Continue
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Explain Video */}
      {currentStep === 'explanation' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Step 2: Explain Your Video
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Describe what this video is about so Grok can generate a compelling title and description.
          </p>

          <textarea
            value={userExplanation}
            onChange={(e) => setUserExplanation(e.target.value)}
            placeholder="Example: This video shows how to optimize React performance using memoization techniques. I demonstrate practical examples with before/after comparisons."
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />

          <button
            onClick={handleGenerateMetadata}
            disabled={isGeneratingMetadata || !userExplanation.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full"
          >
            {isGeneratingMetadata ? 'Generating with Grok AI...' : 'Generate Title & Description'}
          </button>
        </div>
      )}

      {/* Step 3: Review Metadata */}
      {currentStep === 'metadata-review' && generatedMetadata && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Step 3: Review Generated Metadata
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Grok AI has generated a title and description for your video. Accept it or generate a new one.
          </p>

          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
              Title:
            </h3>
            <p className="text-gray-700 dark:text-gray-300">{generatedMetadata.title}</p>

            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mt-4 mb-2">
              Description:
            </h3>
            <p className="text-gray-700 dark:text-gray-300">{generatedMetadata.description}</p>

            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mt-4 mb-2">
              Suggested Hashtags:
            </h3>
            <div className="flex flex-wrap gap-2">
              {generatedMetadata.suggestedHashtags.map((tag, idx) => (
                <span
                  key={idx}
                  className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleRegenerateMetadata}
              disabled={isGeneratingMetadata}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
            >
              {isGeneratingMetadata ? 'Regenerating...' : 'Generate Another'}
            </button>
            <button
              onClick={handleAcceptMetadata}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Accept & Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: User Goal */}
      {currentStep === 'goal' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Step 4: What's Your Goal?
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Describe what you want to achieve with this post. Grok will create optimized content in English and Spanish.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Goal
              </label>
              <textarea
                value={userGoal}
                onChange={(e) => setUserGoal(e.target.value)}
                placeholder="Example: Increase product sales, attract followers from Asia, promote upcoming event, etc."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Audience (Optional)
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Example: Tech enthusiasts in Asia, Spanish-speaking entrepreneurs, etc."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <button
            onClick={handleGeneratePosts}
            disabled={isGeneratingPosts || !userGoal.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full"
          >
            {isGeneratingPosts ? 'Generating Posts with Grok AI...' : 'Generate Post Variants'}
          </button>
        </div>
      )}

      {/* Step 5: Select Post Variant */}
      {currentStep === 'post-selection' && postVariants && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Step 5: Choose Your Post
          </h2>
          <p className="text-red-600 dark:text-red-400 font-semibold">
            ⚠️ IMPORTANT: You can only publish in ONE language to avoid spam detection
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* English Variant */}
            <div
              onClick={() => setSelectedLanguage('en')}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                selectedLanguage === 'en'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  English Version
                </h3>
                {selectedLanguage === 'en' && (
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                    Selected
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Content:
                  </p>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">
                    {postVariants.english.content}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Hashtags:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {postVariants.english.hashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {postVariants.english.cta && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      CTA:
                    </p>
                    <p className="text-gray-800 dark:text-gray-200 mt-1">
                      {postVariants.english.cta}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Spanish Variant */}
            <div
              onClick={() => setSelectedLanguage('es')}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                selectedLanguage === 'es'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Spanish Version
                </h3>
                {selectedLanguage === 'es' && (
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                    Seleccionado
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Contenido:
                  </p>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">
                    {postVariants.spanish.content}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Hashtags:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {postVariants.spanish.hashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {postVariants.spanish.cta && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      CTA:
                    </p>
                    <p className="text-gray-800 dark:text-gray-200 mt-1">
                      {postVariants.spanish.cta}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleRegeneratePosts}
              disabled={isGeneratingPosts}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
            >
              {isGeneratingPosts ? 'Regenerating...' : 'Generate Different Posts'}
            </button>
            <button
              onClick={() => handlePublish(false)}
              disabled={!selectedLanguage || isPublishing}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
            >
              {isPublishing ? 'Publishing...' : 'Publish Now'}
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Success */}
      {currentStep === 'publish' && publishSuccess && (
        <div className="text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Video Published Successfully!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your video has been published in {selectedLanguage === 'en' ? 'English' : 'Spanish'}.
          </p>

          <button
            onClick={handleReset}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold"
          >
            Upload Another Video
          </button>
        </div>
      )}
    </div>
  );
}
