import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import api from '../lib/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface MetricsData {
  engagementByPlatform: {
    platform: string;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
    avgEngagement: number;
  }[];
  engagementOverTime: {
    date: string;
    engagement: number;
  }[];
  postsByStatus: {
    status: string;
    count: number;
  }[];
  topPerformingPosts: {
    id: string;
    text: string;
    platform: string;
    engagement: number;
    likes: number;
    shares: number;
    comments: number;
  }[];
}

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days'>('30days');

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/posts/analytics/metrics?range=${dateRange}`);
      setMetrics(response.data);
    } catch (error: any) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!metrics) return;

    // Prepare CSV data
    const headers = ['Platform', 'Total Likes', 'Total Shares', 'Total Comments', 'Avg Engagement'];
    const rows = metrics.engagementByPlatform.map(item => [
      item.platform,
      item.totalLikes,
      item.totalShares,
      item.totalComments,
      item.avgEngagement.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">No metrics data available</p>
      </div>
    );
  }

  // Platform colors
  const platformColors: Record<string, string> = {
    twitter: '#1DA1F2',
    instagram: '#E4405F',
    facebook: '#4267B2',
    linkedin: '#0077B5',
    telegram: '#0088CC',
    youtube: '#FF0000',
    tiktok: '#000000',
  };

  // Engagement by Platform Chart
  const engagementByPlatformData = {
    labels: metrics.engagementByPlatform.map(item => item.platform),
    datasets: [
      {
        label: 'Likes',
        data: metrics.engagementByPlatform.map(item => item.totalLikes),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
      },
      {
        label: 'Shares',
        data: metrics.engagementByPlatform.map(item => item.totalShares),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
      },
      {
        label: 'Comments',
        data: metrics.engagementByPlatform.map(item => item.totalComments),
        backgroundColor: 'rgba(245, 158, 11, 0.7)',
      },
    ],
  };

  // Engagement Over Time Chart
  const engagementOverTimeData = {
    labels: metrics.engagementOverTime.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Engagement Rate',
        data: metrics.engagementOverTime.map(item => item.engagement),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Posts by Status Chart
  const postsByStatusData = {
    labels: metrics.postsByStatus.map(item => item.status),
    datasets: [
      {
        data: metrics.postsByStatus.map(item => item.count),
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)', // scheduled
          'rgba(107, 114, 128, 0.7)', // draft
          'rgba(59, 130, 246, 0.7)', // published
          'rgba(239, 68, 68, 0.7)', // failed
          'rgba(156, 163, 175, 0.7)', // cancelled
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        },
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB',
        },
      },
      y: {
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        },
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your content performance across platforms
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.engagementByPlatform.map(platform => (
          <div key={platform.platform} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{platform.platform}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {platform.avgEngagement.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Avg Engagement</p>
              </div>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: platformColors[platform.platform] || '#6B7280' }}
              >
                <span className="text-xl font-bold">{platform.platform.charAt(0).toUpperCase()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement by Platform */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Engagement by Platform
          </h3>
          <div style={{ height: '300px' }}>
            <Bar data={engagementByPlatformData} options={chartOptions} />
          </div>
        </div>

        {/* Posts by Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Posts by Status
          </h3>
          <div style={{ height: '300px' }}>
            <Doughnut data={postsByStatusData} options={doughnutOptions} />
          </div>
        </div>

        {/* Engagement Over Time */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Engagement Over Time
          </h3>
          <div style={{ height: '300px' }}>
            <Line data={engagementOverTimeData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Top Performing Posts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Top Performing Posts
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Likes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Shares
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Comments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Engagement
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {metrics.topPerformingPosts.map(post => (
                <tr key={post.id}>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-md truncate">
                    {post.text}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="px-2 py-1 rounded text-white text-xs capitalize"
                      style={{ backgroundColor: platformColors[post.platform] || '#6B7280' }}
                    >
                      {post.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {post.likes}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {post.shares}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {post.comments}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-semibold">
                    {post.engagement.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
