/**
 * Upload Metrics Dashboard Component
 * Displays upload statistics and performance metrics
 */

import React, { useState, useEffect } from 'react'
import api from '../lib/api'

interface UploadMetrics {
  totalUploads: number
  completedUploads: number
  failedUploads: number
  activeUploads: number
  queuedUploads: number
  averageUploadSpeed: number // MB/s
  totalDataProcessed: number // MB
  totalProcessingTime: number // seconds
  successRate: number // percentage
}

interface UploadStatistic {
  timestamp: string
  fileSize: number
  uploadSpeed: number
  duration: number
  status: 'success' | 'failed'
}

export function UploadMetricsDashboard() {
  const [metrics, setMetrics] = useState<UploadMetrics | null>(null)
  const [recentUploads, setRecentUploads] = useState<UploadStatistic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h')

  // Fetch metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await api.get('/api/metrics/uploads', {
          params: { timeRange },
        })

        setMetrics(response.data.metrics)
        setRecentUploads(response.data.recentUploads)
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, timeRange])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
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
    )
  }

  if (!metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load metrics. Please try again later.
      </div>
    )
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Upload Metrics</h2>
          <p className="text-gray-600 mt-1">Real-time upload performance statistics</p>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <option value={1000}>Refresh: 1s</option>
            <option value={5000}>Refresh: 5s</option>
            <option value={10000}>Refresh: 10s</option>
            <option value={30000}>Refresh: 30s</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Uploads */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600">Total Uploads</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalUploads}</p>
          <p className="text-xs text-gray-500 mt-2">
            {timeRange === '1h'
              ? 'in the last hour'
              : timeRange === '24h'
                ? 'in the last 24 hours'
                : 'in the last 7 days'}
          </p>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600">Success Rate</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {metrics.successRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {metrics.completedUploads} successful
          </p>
        </div>

        {/* Average Upload Speed */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-gray-600">Avg Upload Speed</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {metrics.averageUploadSpeed.toFixed(2)} MB/s
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {formatBytes(metrics.totalDataProcessed * 1024 * 1024)} total
          </p>
        </div>

        {/* Processing Time */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            {formatDuration(
              metrics.totalProcessingTime / Math.max(metrics.completedUploads, 1)
            )}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {metrics.totalProcessingTime.toFixed(0)}s total
          </p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Uploads */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Active Uploads</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {metrics.activeUploads}
              </p>
            </div>
            <div className="text-3xl text-blue-300">⬆️</div>
          </div>
        </div>

        {/* Queued Uploads */}
        <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Queued Uploads</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">
                {metrics.queuedUploads}
              </p>
            </div>
            <div className="text-3xl text-yellow-300">⏳</div>
          </div>
        </div>

        {/* Failed Uploads */}
        <div className="bg-red-50 rounded-lg p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Failed Uploads</p>
              <p className="text-2xl font-bold text-red-900 mt-1">
                {metrics.failedUploads}
              </p>
            </div>
            <div className="text-3xl text-red-300">❌</div>
          </div>
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Uploads</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  File Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Upload Speed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentUploads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-600">
                    No recent uploads
                  </td>
                </tr>
              ) : (
                recentUploads.map((upload, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(upload.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatBytes(upload.fileSize)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {upload.uploadSpeed.toFixed(2)} MB/s
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDuration(upload.duration)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          upload.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {upload.status === 'success' ? '✓ Success' : '✗ Failed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Performance Tips</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>
            • Use Chrome or Firefox for best upload speeds (supports multiple concurrent uploads)
          </li>
          <li>• Upload during off-peak hours for faster processing times</li>
          <li>
            • If upload speed is slow, check your internet connection and network bandwidth
          </li>
          <li>• Pause other uploads if you want to prioritize a specific video</li>
          <li>• Failed uploads will automatically retry 3 times before being marked as failed</li>
        </ul>
      </div>
    </div>
  )
}
