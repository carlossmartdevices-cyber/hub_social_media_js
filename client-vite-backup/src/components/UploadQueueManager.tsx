/**
 * Upload Queue Manager Component
 * Manages multiple video uploads with queue visualization and controls
 */

import React, { useState, useEffect, useCallback } from 'react'
import { ResumableUploadManager } from '../utils/ResumableUploadManager'
import { UploadProgressCard } from './UploadProgressCard'
import { UploadTask, UploadProgress } from '../../../src/types/upload.types'

interface UploadQueueManagerProps {
  onUploadComplete?: (uploadId: string, videoUrl: string) => void
  onUploadFailed?: (uploadId: string, error: string) => void
}

export const UploadQueueManager: React.FC<UploadQueueManagerProps> = ({
  onUploadComplete,
  onUploadFailed,
}) => {
  const [uploadManager] = useState(
    () =>
      new ResumableUploadManager(
        {
          maxConcurrentUploads: 2,
          maxQueuedUploads: 10,
          chunkSize: 5 * 1024 * 1024, // 5MB
          maxUploadSpeedMbps: 0, // Unlimited
          maxRetries: 3,
        },
        {
          onProgress: (uploadId, progress) => {
            setUploadProgress((prev) => ({ ...prev, [uploadId]: progress }))
          },
          onUploadComplete: (uploadId, videoUrl) => {
            setUploadStatuses((prev) => ({ ...prev, [uploadId]: 'completed' }))
            onUploadComplete?.(uploadId, videoUrl)
          },
          onUploadFailed: (uploadId, error) => {
            setUploadStatuses((prev) => ({ ...prev, [uploadId]: 'failed' }))
            setUploadErrors((prev) => ({ ...prev, [uploadId]: error }))
            onUploadFailed?.(uploadId, error)
          },
          onStatusChange: (uploadId, status) => {
            setUploadStatuses((prev) => ({ ...prev, [uploadId]: status }))
          },
        }
      )
  )

  const [uploads, setUploads] = useState<Map<string, UploadTask>>(new Map())
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadTask['status']>>({})
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({})
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})
  const [uploadOrder, setUploadOrder] = useState<string[]>([])
  const [throttleSpeed, setThrottleSpeed] = useState(0) // 0 = unlimited
  const [isDragOver, setIsDragOver] = useState(false)

  // Initialize from recovered uploads
  useEffect(() => {
    const initializeUploads = async () => {
      const recovered = await uploadManager.recoverUnfinishedUploads()
      recovered.forEach((uploadId) => {
        const task = uploadManager.getQueuedUploads().find((u) => u.uploadId === uploadId) ||
                     uploadManager.getActiveUploads().find((u) => u.uploadId === uploadId)
        if (task) {
          setUploads((prev) => new Map(prev).set(uploadId, task))
          setUploadOrder((prev) => [...prev, uploadId])
          setUploadStatuses((prev) => ({ ...prev, [uploadId]: task.status }))
        }
      })
    }

    initializeUploads()
  }, [])

  // Handle file drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('video/')
      )

      for (const file of files) {
        try {
          const uploadId = await uploadManager.addToQueue(file, {
            title: file.name.replace(/\.[^/.]+$/, ''),
          })

          const newTask = uploadManager.getQueuedUploads().find(
            (u) => u.uploadId === uploadId
          )
          if (newTask) {
            setUploads((prev) => new Map(prev).set(uploadId, newTask))
            setUploadOrder((prev) => [...prev, uploadId])
            setUploadStatuses((prev) => ({ ...prev, [uploadId]: 'pending' }))
          }
        } catch (error) {
          console.error(`Failed to add upload: ${error}`)
        }
      }
    },
    [uploadManager]
  )

  const handlePause = useCallback(
    (uploadId: string) => {
      uploadManager.pauseUpload(uploadId)
    },
    [uploadManager]
  )

  const handleResume = useCallback(
    (uploadId: string) => {
      uploadManager.resumeUpload(uploadId)
    },
    [uploadManager]
  )

  const handleCancel = useCallback(
    async (uploadId: string) => {
      await uploadManager.cancelUpload(uploadId)
      setUploads((prev) => {
        const newMap = new Map(prev)
        newMap.delete(uploadId)
        return newMap
      })
      setUploadOrder((prev) => prev.filter((id) => id !== uploadId))
      setUploadStatuses((prev) => {
        const newStatuses = { ...prev }
        delete newStatuses[uploadId]
        return newStatuses
      })
      setUploadProgress((prev) => {
        const newProgress = { ...prev }
        delete newProgress[uploadId]
        return newProgress
      })
      setUploadErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[uploadId]
        return newErrors
      })
    },
    [uploadManager]
  )

  const handleRetry = useCallback(
    (uploadId: string) => {
      // Remove from errors and retry
      setUploadErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[uploadId]
        return newErrors
      })
      uploadManager.resumeUpload(uploadId)
    },
    [uploadManager]
  )

  const handlePauseAll = useCallback(() => {
    uploadManager.getActiveUploads().forEach((task) => {
      uploadManager.pauseUpload(task.uploadId)
    })
  }, [uploadManager])

  const handleResumeAll = useCallback(() => {
    uploadManager.getQueuedUploads().forEach((task) => {
      if (task.status === 'paused' || task.status === 'pending') {
        uploadManager.resumeUpload(task.uploadId)
      }
    })
  }, [uploadManager])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files
      if (!files) return

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('video/')) continue

        try {
          const uploadId = await uploadManager.addToQueue(file, {
            title: file.name.replace(/\.[^/.]+$/, ''),
          })

          const newTask = uploadManager.getQueuedUploads().find(
            (u) => u.uploadId === uploadId
          )
          if (newTask) {
            setUploads((prev) => new Map(prev).set(uploadId, newTask))
            setUploadOrder((prev) => [...prev, uploadId])
            setUploadStatuses((prev) => ({ ...prev, [uploadId]: 'pending' }))
          }
        } catch (error) {
          console.error(`Failed to add upload: ${error}`)
        }
      }

      e.currentTarget.value = ''
    },
    [uploadManager]
  )

  const activeCount = uploadManager.getActiveUploads().length
  const queuedCount = uploadManager.getQueuedUploads().length
  const completedCount = Array.from(uploads.values()).filter(
    (task) => uploadStatuses[task.uploadId] === 'completed'
  ).length

  const totalProgress =
    Array.from(uploads.values()).length > 0
      ? Math.round(
          (Array.from(uploads.values()).filter(
            (task) => uploadStatuses[task.uploadId] === 'completed'
          ).length /
            Array.from(uploads.values()).length) *
            100
        )
      : 0

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Upload Manager
        </h2>
        <p className="text-gray-600">
          Queue multiple videos for processing. Upload large files up to 5GB.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-gray-600">Active Uploads</p>
          <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-gray-600">Queued</p>
          <p className="text-2xl font-bold text-yellow-600">{queuedCount}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-gray-600">Overall Progress</p>
          <p className="text-2xl font-bold text-purple-600">{totalProgress}%</p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-all ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <svg
          className="w-12 h-12 mx-auto text-gray-400 mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <p className="text-gray-700 font-medium mb-1">
          Drag and drop video files here
        </p>
        <p className="text-sm text-gray-600 mb-3">
          or
        </p>
        <label className="inline-block">
          <input
            type="file"
            multiple
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <span className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 cursor-pointer transition-colors">
            Select Files
          </span>
        </label>
        <p className="text-xs text-gray-600 mt-3">
          Maximum file size: 5GB per video
        </p>
      </div>

      {/* Controls */}
      {Array.from(uploads.values()).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-200">
          <button
            onClick={handlePauseAll}
            className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded transition-colors"
          >
            Pause All
          </button>
          <button
            onClick={handleResumeAll}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
          >
            Resume All
          </button>

          {/* Bandwidth Throttle */}
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-gray-600">
              Max Speed:
            </label>
            <input
              type="number"
              min="0"
              max="1000"
              value={throttleSpeed}
              onChange={(e) => setThrottleSpeed(Number(e.target.value))}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Mbps"
            />
            <span className="text-sm text-gray-600">Mbps</span>
          </div>
        </div>
      )}

      {/* Upload List */}
      <div className="space-y-3">
        {uploadOrder.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No videos queued for upload</p>
          </div>
        ) : (
          uploadOrder.map((uploadId) => {
            const task = uploads.get(uploadId)
            if (!task) return null

            return (
              <UploadProgressCard
                key={uploadId}
                uploadId={uploadId}
                fileName={task.file.name}
                progress={uploadProgress[uploadId]}
                status={uploadStatuses[uploadId] || 'pending'}
                error={uploadErrors[uploadId]}
                onPause={handlePause}
                onResume={handleResume}
                onCancel={handleCancel}
                onRetry={handleRetry}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
