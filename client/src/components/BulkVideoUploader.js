import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import api from '../lib/api';
export function BulkVideoUploader() {
    const [currentStep, setCurrentStep] = useState('upload');
    const [videos, setVideos] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [publishSuccess, setPublishSuccess] = useState(false);
    const fileInputRef = useRef(null);
    // Helper to validate blob URLs
    const isValidBlobUrl = (url) => {
        return url.startsWith('blob:');
    };
    // Step 1: Handle multiple video file selection
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 6) {
            alert('Maximum 6 videos allowed for bulk upload');
            return;
        }
        // Validate file types
        const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
        const invalidFiles = files.filter(f => !validTypes.includes(f.type));
        if (invalidFiles.length > 0) {
            alert('Invalid file types detected. Please select only MP4, MOV, or AVI files.');
            return;
        }
        const newVideos = files.map((file) => ({
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
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
                        setVideos((prev) => prev.map((v, idx) => idx === i ? { ...v, uploadProgress: percentCompleted } : v));
                    },
                });
                if (response.data.success) {
                    setVideos((prev) => prev.map((v, idx) => idx === i ? { ...v, postId: response.data.post.id } : v));
                }
            }
            catch (error) {
                alert(`Error uploading video ${i + 1}: ${error.response?.data?.error || error.message}`);
            }
        }
        setIsProcessing(false);
        setCurrentStep('explanation');
    };
    // Step 2: Update explanation for a video
    const updateVideoExplanation = (index, explanation) => {
        setVideos((prev) => prev.map((v, idx) => (idx === index ? { ...v, explanation } : v)));
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
                    setVideos((prev) => prev.map((v, idx) => idx === i ? { ...v, metadata: response.data.metadata } : v));
                }
            }
            catch (error) {
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
            if (!video.metadata || !video.postId)
                continue;
            try {
                await api.put(`/video/${video.postId}/metadata`, {
                    title: video.metadata.title,
                    description: video.metadata.description,
                    hashtags: video.metadata.suggestedHashtags,
                });
            }
            catch (error) {
                alert(`Error updating metadata for video ${i + 1}: ${error.response?.data?.error || error.message}`);
            }
        }
        setIsProcessing(false);
        setCurrentStep('goal');
    };
    // Step 4: Update user goal for a video
    const updateVideoGoal = (index, goal) => {
        setVideos((prev) => prev.map((v, idx) => (idx === index ? { ...v, userGoal: goal } : v)));
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
                setVideos((prev) => prev.map((v, idx) => ({
                    ...v,
                    postVariants: allVariants[idx],
                })));
                setCurrentStep('post-selection');
            }
        }
        catch (error) {
            alert(`Error generating posts: ${error.response?.data?.error || error.message}`);
        }
        finally {
            setIsProcessing(false);
        }
    };
    // Step 5: Select language for a video
    const selectVideoLanguage = (index, language) => {
        setVideos((prev) => prev.map((v, idx) => (idx === index ? { ...v, selectedLanguage: language } : v)));
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
            }
            catch (error) {
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
    return (_jsxs("div", { className: "max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6", children: [_jsx("div", { className: "mb-8", children: _jsx("div", { className: "flex items-center justify-between", children: [
                        { id: 'upload', label: '1. Upload' },
                        { id: 'explanation', label: '2. Explain' },
                        { id: 'metadata-review', label: '3. Review' },
                        { id: 'goal', label: '4. Goals' },
                        { id: 'post-selection', label: '5. Select' },
                        { id: 'publish', label: '6. Publish' },
                    ].map((step, index) => (_jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: `w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep === step.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`, children: index + 1 }), index < 5 && _jsx("div", { className: "w-12 h-1 bg-gray-200 dark:bg-gray-700 mx-2" })] }, step.id))) }) }), currentStep === 'upload' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Bulk Upload (Max 6 Videos)" }), _jsxs("div", { className: "border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center", children: [_jsx("input", { type: "file", ref: fileInputRef, onChange: handleFileSelect, accept: "video/mp4,video/quicktime,video/x-msvideo", multiple: true, className: "hidden" }), _jsx("button", { onClick: () => fileInputRef.current?.click(), className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold", children: "Select Videos (Max 6)" }), _jsx("p", { className: "mt-2 text-sm text-gray-500 dark:text-gray-400", children: "MP4, MOV, AVI (max 500MB each)" })] }), videos.length > 0 && (_jsxs("div", { className: "mt-4 space-y-4", children: [_jsxs("p", { className: "font-semibold text-gray-900 dark:text-white", children: ["Selected ", videos.length, " video", videos.length > 1 ? 's' : '', ":"] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: videos.map((video, idx) => (_jsxs("div", { className: "border border-gray-300 dark:border-gray-600 rounded-lg p-2", children: [isValidBlobUrl(video.preview) && (_jsx("video", { src: video.preview, className: "w-full h-32 object-cover rounded" })), _jsx("p", { className: "text-xs text-gray-600 dark:text-gray-400 mt-1 truncate", children: video.file.name }), video.uploadProgress > 0 && video.uploadProgress < 100 && (_jsx("div", { className: "mt-2", children: _jsx("div", { className: "w-full bg-gray-200 rounded-full h-1", children: _jsx("div", { className: "bg-blue-600 h-1 rounded-full", style: { width: `${video.uploadProgress}%` } }) }) }))] }, idx))) }), _jsx("button", { onClick: handleUploadAll, disabled: isProcessing, className: "bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full", children: isProcessing ? 'Uploading...' : 'Upload All Videos' })] }))] })), currentStep === 'explanation' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Explain Each Video" }), videos.map((video, idx) => (_jsx("div", { className: "border border-gray-300 dark:border-gray-600 rounded-lg p-4", children: _jsxs("div", { className: "flex gap-4", children: [isValidBlobUrl(video.preview) && (_jsx("video", { src: video.preview, className: "w-32 h-24 object-cover rounded" })), _jsxs("div", { className: "flex-1", children: [_jsxs("p", { className: "font-semibold text-gray-900 dark:text-white mb-2", children: ["Video ", idx + 1, ": ", video.file.name] }), _jsx("textarea", { value: video.explanation, onChange: (e) => updateVideoExplanation(idx, e.target.value), placeholder: "Explain what this video is about...", rows: 3, className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" })] })] }) }, idx))), _jsx("button", { onClick: handleGenerateAllMetadata, disabled: isProcessing, className: "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full", children: isProcessing ? 'Generating Metadata for All Videos...' : 'Generate All Metadata with Grok' })] })), currentStep === 'metadata-review' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Review Generated Metadata" }), videos.map((video, idx) => (_jsxs("div", { className: "border border-gray-300 dark:border-gray-600 rounded-lg p-4", children: [_jsxs("p", { className: "font-semibold text-lg text-gray-900 dark:text-white mb-2", children: ["Video ", idx + 1, ": ", video.file.name] }), video.metadata && (_jsxs("div", { className: "bg-gray-50 dark:bg-gray-700 p-3 rounded-lg", children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Title:" }), _jsx("p", { className: "text-gray-800 dark:text-gray-200", children: video.metadata.title }), _jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2", children: "Description:" }), _jsx("p", { className: "text-gray-800 dark:text-gray-200", children: video.metadata.description }), _jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2", children: "Hashtags:" }), _jsx("div", { className: "flex flex-wrap gap-2 mt-1", children: video.metadata.suggestedHashtags.map((tag, tagIdx) => (_jsxs("span", { className: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm", children: ["#", tag] }, tagIdx))) })] }))] }, idx))), _jsx("button", { onClick: handleAcceptAllMetadata, disabled: isProcessing, className: "bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full", children: isProcessing ? 'Saving...' : 'Accept All & Continue' })] })), currentStep === 'goal' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Set Goals for Each Video" }), videos.map((video, idx) => (_jsxs("div", { className: "border border-gray-300 dark:border-gray-600 rounded-lg p-4", children: [_jsxs("p", { className: "font-semibold text-gray-900 dark:text-white mb-2", children: ["Video ", idx + 1, ": ", video.metadata?.title] }), _jsx("textarea", { value: video.userGoal, onChange: (e) => updateVideoGoal(idx, e.target.value), placeholder: "What's your goal for this video? (e.g., increase sales, attract Asian audience)", rows: 2, className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" })] }, idx))), _jsx("button", { onClick: handleGenerateAllPosts, disabled: isProcessing, className: "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full", children: isProcessing ? 'Generating Posts for All Videos...' : 'Generate All Posts with Grok' })] })), currentStep === 'post-selection' && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Choose Language for Each Video" }), _jsx("p", { className: "text-red-600 dark:text-red-400 font-semibold mt-2", children: "\u26A0\uFE0F IMPORTANT: Select ONE language per video to avoid spam detection" })] }), videos.map((video, idx) => (_jsxs("div", { className: "border border-gray-300 dark:border-gray-600 rounded-lg p-4", children: [_jsxs("p", { className: "font-semibold text-lg text-gray-900 dark:text-white mb-3", children: ["Video ", idx + 1, ": ", video.metadata?.title] }), video.postVariants && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [_jsxs("div", { onClick: () => selectVideoLanguage(idx, 'en'), className: `p-4 rounded-lg border cursor-pointer ${video.selectedLanguage === 'en'
                                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-300 dark:border-gray-600'}`, children: [_jsxs("h4", { className: "font-bold text-gray-900 dark:text-white mb-2", children: ["English ", video.selectedLanguage === 'en' && '✓'] }), _jsx("p", { className: "text-sm text-gray-800 dark:text-gray-200", children: video.postVariants.english.content }), _jsx("div", { className: "flex flex-wrap gap-1 mt-2", children: video.postVariants.english.hashtags.map((tag, tagIdx) => (_jsxs("span", { className: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs", children: ["#", tag] }, tagIdx))) })] }), _jsxs("div", { onClick: () => selectVideoLanguage(idx, 'es'), className: `p-4 rounded-lg border cursor-pointer ${video.selectedLanguage === 'es'
                                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-300 dark:border-gray-600'}`, children: [_jsxs("h4", { className: "font-bold text-gray-900 dark:text-white mb-2", children: ["Espa\u00F1ol ", video.selectedLanguage === 'es' && '✓'] }), _jsx("p", { className: "text-sm text-gray-800 dark:text-gray-200", children: video.postVariants.spanish.content }), _jsx("div", { className: "flex flex-wrap gap-1 mt-2", children: video.postVariants.spanish.hashtags.map((tag, tagIdx) => (_jsxs("span", { className: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs", children: ["#", tag] }, tagIdx))) })] })] }))] }, idx))), _jsx("button", { onClick: handlePublishAll, disabled: isProcessing || videos.some((v) => !v.selectedLanguage), className: "bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full", children: isProcessing ? 'Publishing All Videos...' : 'Publish All Videos' })] })), currentStep === 'publish' && publishSuccess && (_jsxs("div", { className: "text-center space-y-4", children: [_jsx("div", { className: "text-6xl", children: "\uD83C\uDF89" }), _jsx("h2", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: "All Videos Published Successfully!" }), _jsxs("p", { className: "text-gray-600 dark:text-gray-400", children: [videos.length, " video", videos.length > 1 ? 's' : '', " published successfully."] }), _jsx("button", { onClick: handleReset, className: "bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold", children: "Upload More Videos" })] }))] }));
}
