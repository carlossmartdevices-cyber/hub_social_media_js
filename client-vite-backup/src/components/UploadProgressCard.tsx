/**
 * Upload Progress Card Component
 * Displays progress for a single upload with pause/resume/cancel controls
 */

import React, { useState, useEffect } from 'react'
import { UploadProgress } from '../../../src/types/upload.types'

interface UploadProgressCardProps {
  uploadId: string
  fileName: string
  progress?: UploadProgress
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed'
  error?: string
  onPause: (uploadId: string) => void
  onResume: (uploadId: string) => void
  onCancel: (uploadId: string) => void
  onRetry?: (uploadId: string) => void
}

export const UploadProgressCard: React.FC<UploadProgressCardProps> = ({
  uploadId,
  fileName,
  progress,
  status,
  error,
  onPause,
  onResume,
  onCancel,
  onRetry,
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const progressPercent = progress?.progress || 0
  const uploadSpeed = progress
    ? formatBytes(progress.uploadSpeed) + '/s'
    : 'Calculating...'
  const remainingTime = progress
    ? formatRemainingTime(progress.remainingTime)
    : '--:--'
  const uploadedBytes = progress ? formatBytes(progress.uploadedBytes) : '0 B'
  const totalBytes = progress ? formatBytes(progress.totalBytes) : '0 B'

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-50 border-blue-200'
      case 'paused':
        return 'bg-yellow-50 border-yellow-200'
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'failed':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getProgressColor = () => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-500'
      case 'paused':
        return 'bg-yellow-500'
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'uploading':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Uploading</span>
      case 'paused':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">Paused</span>
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Completed</span>
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Failed</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Pending</span>
    }
  }

  return (
    <div
      className={`border rounded-lg p-4 ${getStatusColor()} transition-all ${
        isHovered ? 'shadow-md' : 'shadow-sm'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-gray-900 truncate">
            {fileName}
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            {uploadedBytes} / {totalBytes}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Progress Bar */}
      {status !== 'pending' && (
        <div className="mb-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-300`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Progress Info */}
      {status === 'uploading' && progress && (
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <div>
            <p className="text-gray-600">Speed</p>
            <p className="font-mono font-semibold text-gray-900">{uploadSpeed}</p>
          </div>
          <div>
            <p className="text-gray-600">Progress</p>
            <p className="font-mono font-semibold text-gray-900">
              {progress.uploadedChunks}/{progress.totalChunks} chunks
            </p>
          </div>
          <div>
            <p className="text-gray-600">Time Left</p>
            <p className="font-mono font-semibold text-gray-900">{remainingTime}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && status === 'failed' && (
        <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Percentage Display */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-900">
          {progressPercent}%
        </span>
        {status === 'paused' && (
          <span className="text-xs text-yellow-600 font-medium">Paused</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {status === 'uploading' && (
          <button
            onClick={() => onPause(uploadId)}
            className="flex-1 px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded transition-colors"
          >
            Pause
          </button>
        )}

        {status === 'paused' && (
          <button
            onClick={() => onResume(uploadId)}
            className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
          >
            Resume
          </button>
        )}

        {status === 'failed' && onRetry && (
          <button
            onClick={() => onRetry(uploadId)}
            className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
          >
            Retry
          </button>
        )}

        {status !== 'completed' && (
          <button
            onClick={() => onCancel(uploadId)}
            className="flex-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors"
          >
            Cancel
          </button>
        )}

        {status === 'completed' && (
          <button
            disabled
            className="flex-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded cursor-not-allowed"
          >
            Done
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format remaining time in milliseconds to HH:MM:SS format
 */
function formatRemainingTime(ms: number): string {
  if (!ms || ms < 0) return '00:00'

  const seconds = Math.round(ms / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  } else {
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
}
