import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MultiPlatformPublisher } from '../components/MultiPlatformPublisher';
export default function MultiPlatformPublish() {
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
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
                const readyVideos = response.data.posts.filter((post) => post.processing_status === 'ready');
                setVideos(readyVideos);
            }
        }
        catch (error) {
            console.error('Failed to load videos:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handlePublishSuccess = (results) => {
        setPublishSuccess(true);
        // Reload videos to update their status
        loadVideos();
    };
    const handlePublishError = (error) => {
        alert(`Publish Error: ${error}`);
    };
    const handleSelectAnother = () => {
        setSelectedVideo(null);
        setPublishSuccess(false);
    };
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };
    if (loading) {
        return (_jsx("div", { className: "px-4 sm:px-6 lg:px-8", children: _jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsxs("svg", { className: "animate-spin h-12 w-12 text-blue-600 mx-auto mb-4", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading your videos..." })] }) }) }));
    }
    return (_jsxs("div", { className: "px-4 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: "Multi-Platform Publishing" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-2", children: "Publish your videos to both Twitter and Telegram simultaneously" })] }), publishSuccess ? (_jsx("div", { className: "mb-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-5xl mb-4", children: "\uD83C\uDF89" }), _jsx("h2", { className: "text-2xl font-bold text-green-900 dark:text-green-100 mb-2", children: "Published Successfully!" }), _jsx("p", { className: "text-green-700 dark:text-green-300 mb-4", children: "Your video has been published to the selected platforms." }), _jsx("button", { onClick: handleSelectAnother, className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold", children: "Publish Another Video" })] }) })) : selectedVideo ? (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6", children: _jsxs("div", { className: "flex items-start gap-6", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("img", { src: selectedVideo.thumbnail_url, alt: "Video thumbnail", className: "w-48 h-32 object-cover rounded-lg" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-xl font-bold text-gray-900 dark:text-white mb-2", children: selectedVideo.video_metadata?.title || 'Untitled Video' }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mb-3", children: selectedVideo.video_metadata?.description ||
                                                selectedVideo.content?.description ||
                                                'No description' }), _jsxs("div", { className: "flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400", children: [_jsxs("span", { children: ["Duration: ", formatDuration(selectedVideo.video_duration)] }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: ["Uploaded: ", formatDate(selectedVideo.created_at)] }), selectedVideo.platforms && selectedVideo.platforms.length > 0 && (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2022" }), _jsxs("span", { children: ["Previously published to: ", selectedVideo.platforms.join(', ')] })] }))] })] }), _jsx("button", { onClick: handleSelectAnother, className: "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200", children: _jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }) }), _jsx(MultiPlatformPublisher, { postId: selectedVideo.id, videoMetadata: {
                            title: selectedVideo.video_metadata?.title || selectedVideo.content?.title,
                            description: selectedVideo.video_metadata?.description ||
                                selectedVideo.content?.description,
                            hashtags: selectedVideo.video_metadata?.hashtags || [],
                        }, onPublishSuccess: handlePublishSuccess, onPublishError: handlePublishError })] })) : (_jsx("div", { children: videos.length === 0 ? (_jsxs("div", { className: "text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md", children: [_jsx("svg", { className: "w-16 h-16 text-gray-400 mx-auto mb-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" }) }), _jsx("h3", { className: "text-xl font-semibold text-gray-900 dark:text-white mb-2", children: "No Videos Available" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mb-6", children: "Upload some videos first before publishing to multiple platforms." }), _jsx("a", { href: "/videos/upload", className: "inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold", children: "Upload Video" })] })) : (_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-gray-900 dark:text-white mb-4", children: "Select a Video to Publish" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: videos.map((video) => (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer", onClick: () => setSelectedVideo(video), children: [_jsxs("div", { className: "relative", children: [_jsx("img", { src: video.thumbnail_url, alt: "Video thumbnail", className: "w-full h-48 object-cover" }), _jsx("div", { className: "absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded", children: formatDuration(video.video_duration) }), video.status === 'published' && (_jsx("div", { className: "absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded", children: "Published" }))] }), _jsxs("div", { className: "p-4", children: [_jsx("h3", { className: "font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2", children: video.video_metadata?.title || video.content?.title || 'Untitled Video' }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3", children: video.video_metadata?.description ||
                                                    video.content?.description ||
                                                    'No description' }), _jsxs("div", { className: "flex items-center justify-between text-xs text-gray-500 dark:text-gray-400", children: [_jsx("span", { children: formatDate(video.created_at) }), video.platforms && video.platforms.length > 0 && (_jsx("span", { className: "flex items-center gap-1", children: video.platforms.map((platform) => (_jsx("span", { className: "bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded capitalize", children: platform }, platform))) }))] })] })] }, video.id))) })] })) }))] }));
}
