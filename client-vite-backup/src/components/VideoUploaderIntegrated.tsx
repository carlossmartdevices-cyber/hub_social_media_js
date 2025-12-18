/**
 * Enhanced Video Uploader Component
 * Integrates with the new chunked upload system
 * Provides seamless experience for large video uploads with resumable capabilities
 */

import React, { useState, useRef, useEffect } from 'react'
import { UploadQueueManager } from './UploadQueueManager'
import { ResumableUploadManager } from '../utils/ResumableUploadManager'
import { getUploadStorage } from '../utils/uploadStorage'
import api from '../lib/api'

type Step = 'upload' | 'processing' | 'metadata' | 'publish' | 'complete'

interface VideoMetadata {
  title: string
  description: string
  suggestedHashtags: string[]
  seoTitle: string
  seoDescription: string
  keywords: string[]
  tags: string[]
  performers?: string[]
  niche?: {
    primary: string
    tags: string[]
  }
}

interface PostVariant {
  language: 'en' | 'es'
  content: string
  hashtags: string[]
  cta?: string
}

interface PostVariants {
  english: PostVariant
  spanish: PostVariant
}

interface ProcessedVideo {
  uploadId: string
  postId: string
  videoUrl: string
  thumbnailUrl?: string
  metadata?: VideoMetadata
  postVariants?: PostVariants
}

export function VideoUploaderIntegrated() {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [processedVideos, setProcessedVideos] = useState<ProcessedVideo[]>([])
  const [currentVideo, setCurrentVideo] = useState<ProcessedVideo | null>(null)
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false)
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const uploadStorageRef = useRef(getUploadStorage())

  // Recover unfinished uploads on mount
  useEffect(() => {
    const recoverUploads = async () => {
      try {
        const storage = uploadStorageRef.current
        const paused = await storage.getUploadsByStatus('paused')
        const pending = await storage.getUploadsByStatus('pending')

        if (paused.length > 0 || pending.length > 0) {
          console.log(
            `Recovered ${paused.length + pending.length} unfinished uploads`
          )
        }
      } catch (error) {
        console.warn('Failed to recover uploads:', error)
      }
    }

    recoverUploads()
  }, [])

  /**
   * Handle upload completion
   */
  const handleUploadComplete = async (uploadId: string, videoUrl: string) => {
    try {
      setCurrentStep('processing')

      // Fetch video metadata
      const response = await api.get(`/api/video/status/${uploadId}`)
      const { postId, metadata } = response.data

      const video: ProcessedVideo = {
        uploadId,
        postId,
        videoUrl,
        metadata,
      }

      setCurrentVideo(video)
      setProcessedVideos((prev) => [...prev, video])
      setCurrentStep('metadata')
    } catch (error) {
      setErrorMessage(`Failed to process uploaded video: ${error}`)
      setCurrentStep('upload')
    }
  }

  /**
   * Handle upload failure
   */
  const handleUploadFailed = (uploadId: string, error: string) => {
    setErrorMessage(`Upload failed: ${error}`)
    console.error(`Upload ${uploadId} failed:`, error)
  }

  /**
   * Generate metadata for current video
   */
  const generateMetadata = async () => {
    if (!currentVideo) return

    setIsGeneratingMetadata(true)
    try {
      const response = await api.post('/api/video/generate-metadata', {
        postId: currentVideo.postId,
        videoUrl: currentVideo.videoUrl,
      })

      const metadata = response.data
      setCurrentVideo((prev) => (prev ? { ...prev, metadata } : null))
      setProcessedVideos((prev) =>
        prev.map((v) =>
          v.postId === currentVideo.postId ? { ...v, metadata } : v
        )
      )
    } catch (error) {
      setErrorMessage(`Failed to generate metadata: ${error}`)
    } finally {
      setIsGeneratingMetadata(false)
    }
  }

  /**
   * Generate post variants
   */
  const generatePostVariants = async () => {
    if (!currentVideo) return

    setIsGeneratingPosts(true)
    try {
      const response = await api.post('/api/video/generate-posts', {
        postId: currentVideo.postId,
        metadata: currentVideo.metadata,
      })

      const postVariants = response.data
      setCurrentVideo((prev) => (prev ? { ...prev, postVariants } : null))
      setProcessedVideos((prev) =>
        prev.map((v) =>
          v.postId === currentVideo.postId ? { ...v, postVariants } : v
        )
      )
    } catch (error) {
      setErrorMessage(`Failed to generate posts: ${error}`)
    } finally {
      setIsGeneratingPosts(false)
    }
  }

  /**
   * Publish video to platforms
   */
  const publishVideo = async () => {
    if (!currentVideo) return

    setIsPublishing(true)
    try {
      const response = await api.post(`/api/video/${currentVideo.postId}/publish`, {
        platforms: ['twitter', 'telegram'],
        postVariants: currentVideo.postVariants,
      })

      setCurrentStep('complete')
      console.log('Video published:', response.data)
    } catch (error) {
      setErrorMessage(`Failed to publish video: ${error}`)
    } finally {
      setIsPublishing(false)
    }
  }

  /**
   * Render upload step
   */
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload Videos</h2>
        <p className="text-gray-600">
          Upload large video files up to 5GB with automatic resumption and background processing
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage('')}
            className="text-xs text-red-600 underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <UploadQueueManager
        onUploadComplete={handleUploadComplete}
        onUploadFailed={handleUploadFailed}
      />
    </div>
  )

  /**
   * Render processing step
   */
  const renderProcessingStep = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Video Processing</h2>
        <p className="text-gray-600 mt-2">
          Your video is being processed and optimized for all platforms
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500">
              <svg
                className="h-6 w-6 text-white animate-spin"
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
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-blue-900">Processing Video</h3>
            <p className="text-sm text-blue-700 mt-1">
              Compressing, transcoding, and generating thumbnails
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setCurrentStep('metadata')}
        disabled={!currentVideo}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        Continue to Metadata
      </button>
    </div>
  )

  /**
   * Render metadata step
   */
  const renderMetadataStep = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Metadata & Posts</h2>
        <p className="text-gray-600 mt-2">
          Generate AI-powered metadata and post variants for maximum engagement
        </p>
      </div>

      {currentVideo && (
        <div className="space-y-4">
          {/* Current Video Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">Upload ID</h3>
            <p className="text-sm text-gray-600 font-mono">{currentVideo.uploadId}</p>
          </div>

          {/* Generate Metadata Button */}
          <button
            onClick={generateMetadata}
            disabled={isGeneratingMetadata || !currentVideo}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isGeneratingMetadata && (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span>
              {isGeneratingMetadata ? 'Generating...' : 'Generate Metadata'}
            </span>
          </button>

          {/* Display Generated Metadata */}
          {currentVideo.metadata && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">Generated Metadata</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-green-900">Title:</span>{' '}
                  <span className="text-green-700">{currentVideo.metadata.title}</span>
                </p>
                <p>
                  <span className="font-medium text-green-900">Description:</span>{' '}
                  <span className="text-green-700">
                    {currentVideo.metadata.description.substring(0, 100)}...
                  </span>
                </p>
                <p>
                  <span className="font-medium text-green-900">Hashtags:</span>{' '}
                  <span className="text-green-700">
                    {currentVideo.metadata.suggestedHashtags.join(', ')}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Generate Posts Button */}
          <button
            onClick={generatePostVariants}
            disabled={isGeneratingPosts || !currentVideo.metadata}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isGeneratingPosts && (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span>
              {isGeneratingPosts ? 'Generating...' : 'Generate Post Variants'}
            </span>
          </button>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep('upload')}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep('publish')}
              disabled={!currentVideo.postVariants}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              Continue to Publish
            </button>
          </div>
        </div>
      )}
    </div>
  )

  /**
   * Render publish step
   */
  const renderPublishStep = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Publish</h2>
        <p className="text-gray-600 mt-2">
          Publish your video to multiple platforms with optimized content
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Platforms</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="ml-2 text-gray-700">Twitter/X</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="ml-2 text-gray-700">Telegram</span>
            </label>
          </div>
        </div>
      </div>

      <button
        onClick={publishVideo}
        disabled={isPublishing}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        {isPublishing && (
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        <span>{isPublishing ? 'Publishing...' : 'Publish to Platforms'}</span>
      </button>
    </div>
  )

  /**
   * Render complete step
   */
  const renderCompleteStep = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <svg
          className="w-16 h-16 text-green-500 mx-auto mb-4"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Video Published!</h2>
        <p className="text-gray-600">
          Your video has been successfully published to all selected platforms
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2">Summary</h3>
        <ul className="space-y-1 text-sm text-green-700">
          <li>✓ Video uploaded and processed</li>
          <li>✓ Metadata generated</li>
          <li>✓ Post variants created</li>
          <li>✓ Published to platforms</li>
        </ul>
      </div>

      <button
        onClick={() => {
          setCurrentStep('upload')
          setProcessedVideos([])
          setCurrentVideo(null)
        }}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
      >
        Upload Another Video
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Progress Indicator */}
        {currentStep !== 'upload' && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className={`text-center ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-600'}`}>
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold mx-auto mb-1">
                  1
                </div>
                <p className="text-xs font-medium">Upload</p>
              </div>
              <div className="flex-1 h-1 bg-gray-300 mx-2" />
              <div
                className={`text-center ${['processing', 'metadata', 'publish', 'complete'].includes(currentStep) ? 'text-blue-600' : 'text-gray-600'}`}
              >
                <div className={`w-10 h-10 rounded-full ${['processing', 'metadata', 'publish', 'complete'].includes(currentStep) ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'} flex items-center justify-center font-semibold mx-auto mb-1`}>
                  2
                </div>
                <p className="text-xs font-medium">Metadata</p>
              </div>
              <div className="flex-1 h-1 bg-gray-300 mx-2" />
              <div
                className={`text-center ${['publish', 'complete'].includes(currentStep) ? 'text-blue-600' : 'text-gray-600'}`}
              >
                <div className={`w-10 h-10 rounded-full ${['publish', 'complete'].includes(currentStep) ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'} flex items-center justify-center font-semibold mx-auto mb-1`}>
                  3
                </div>
                <p className="text-xs font-medium">Publish</p>
              </div>
            </div>
          </div>
        )}

        {/* Current Step */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'processing' && renderProcessingStep()}
          {currentStep === 'metadata' && renderMetadataStep()}
          {currentStep === 'publish' && renderPublishStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </div>
      </div>
    </div>
  )
}
