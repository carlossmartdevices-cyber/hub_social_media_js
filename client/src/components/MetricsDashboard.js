import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import api from '../lib/api';
// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);
export function MetricsDashboard() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30days');
    useEffect(() => {
        fetchMetrics();
    }, [dateRange]);
    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/posts/analytics/metrics?range=${dateRange}`);
            setMetrics(response.data);
        }
        catch (error) {
            console.error('Failed to fetch metrics:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const exportToCSV = () => {
        if (!metrics)
            return;
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
        return (_jsx("div", { className: "flex items-center justify-center h-96", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" }) }));
    }
    if (!metrics) {
        return (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "No metrics data available" }) }));
    }
    // Platform colors
    const platformColors = {
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
                position: 'top',
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
                position: 'right',
                labels: {
                    color: document.documentElement.classList.contains('dark') ? '#D1D5DB' : '#374151',
                },
            },
        },
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Analytics Dashboard" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-1", children: "Track your content performance across platforms" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("select", { value: dateRange, onChange: (e) => setDateRange(e.target.value), className: "px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500", children: [_jsx("option", { value: "7days", children: "Last 7 Days" }), _jsx("option", { value: "30days", children: "Last 30 Days" }), _jsx("option", { value: "90days", children: "Last 90 Days" })] }), _jsx("button", { onClick: exportToCSV, className: "px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors", children: "Export CSV" })] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: metrics.engagementByPlatform.map(platform => (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 capitalize", children: platform.platform }), _jsxs("p", { className: "text-2xl font-bold text-gray-900 dark:text-white mt-1", children: [platform.avgEngagement.toFixed(1), "%"] }), _jsx("p", { className: "text-xs text-gray-500 dark:text-gray-500 mt-1", children: "Avg Engagement" })] }), _jsx("div", { className: "w-12 h-12 rounded-full flex items-center justify-center text-white", style: { backgroundColor: platformColors[platform.platform] || '#6B7280' }, children: _jsx("span", { className: "text-xl font-bold", children: platform.platform.charAt(0).toUpperCase() }) })] }) }, platform.platform))) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: "Engagement by Platform" }), _jsx("div", { style: { height: '300px' }, children: _jsx(Bar, { data: engagementByPlatformData, options: chartOptions }) })] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: "Posts by Status" }), _jsx("div", { style: { height: '300px' }, children: _jsx(Doughnut, { data: postsByStatusData, options: doughnutOptions }) })] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: "Engagement Over Time" }), _jsx("div", { style: { height: '300px' }, children: _jsx(Line, { data: engagementOverTimeData, options: chartOptions }) })] })] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: "Top Performing Posts" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200 dark:divide-gray-700", children: [_jsx("thead", { className: "bg-gray-50 dark:bg-gray-900", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Content" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Platform" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Likes" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Shares" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Comments" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Engagement" })] }) }), _jsx("tbody", { className: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700", children: metrics.topPerformingPosts.map(post => (_jsxs("tr", { children: [_jsx("td", { className: "px-6 py-4 text-sm text-gray-900 dark:text-white max-w-md truncate", children: post.text }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: "px-2 py-1 rounded text-white text-xs capitalize", style: { backgroundColor: platformColors[post.platform] || '#6B7280' }, children: post.platform }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white", children: post.likes }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white", children: post.shares }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white", children: post.comments }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-semibold", children: [post.engagement.toFixed(1), "%"] })] }, post.id))) })] }) })] })] }));
}
