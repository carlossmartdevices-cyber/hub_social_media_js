import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import api from '../lib/api';
export function VideoUploader() {
    const [currentStep, setCurrentStep] = useState('upload');
    const [videoFile, setVideoFile] = useState(null);
    const [videoPreview, setVideoPreview] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [postId, setPostId] = useState('');
    // Step 2: User explanation
    const [userExplanation, setUserExplanation] = useState('');
    // Step 3: Generated metadata
    const [generatedMetadata, setGeneratedMetadata] = useState(null);
    const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
    // Step 4: User goal
    const [userGoal, setUserGoal] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    // Step 5: Post variants
    const [postVariants, setPostVariants] = useState(null);
    const [previousAttempts, setPreviousAttempts] = useState([]);
    const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState(null);
    // Step 6: Publishing
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);
    const fileInputRef = useRef(null);
    // Helper to validate blob URLs
    const isValidBlobUrl = (url) => {
        return url.startsWith('blob:');
    };
    // Step 1: Handle video file selection
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        // Validate file type
        const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
        if (!validTypes.includes(file.type)) {
            alert('Invalid file type. Please select MP4, MOV, or AVI.');
            return;
        }
        setVideoFile(file);
        const blobUrl = URL.createObjectURL(file);
        if (isValidBlobUrl(blobUrl)) {
            setVideoPreview(blobUrl);
        }
    };
    // Step 1: Upload video
    const handleUpload = async () => {
        if (!videoFile)
            return;
        try {
            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('title', 'Processing...');
            formData.append('description', '');
            const response = await api.post('/video/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
                    setUploadProgress(percentCompleted);
                },
            });
            if (response.data.success) {
                setPostId(response.data.post.id);
                setCurrentStep('explanation');
            }
        }
        catch (error) {
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
        }
        catch (error) {
            alert('Error generating metadata: ' + (error.response?.data?.error || error.message));
        }
        finally {
            setIsGeneratingMetadata(false);
        }
    };
    // Step 3: Regenerate metadata (if user doesn't like it)
    const handleRegenerateMetadata = async () => {
        await handleGenerateMetadata();
    };
    // Step 3: Accept metadata and move to goal step
    const handleAcceptMetadata = async () => {
        if (!generatedMetadata || !postId)
            return;
        try {
            // Update post with generated metadata
            await api.put(`/video/${postId}/metadata`, {
                title: generatedMetadata.title,
                description: generatedMetadata.description,
                hashtags: generatedMetadata.suggestedHashtags,
            });
            setCurrentStep('goal');
        }
        catch (error) {
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
        }
        catch (error) {
            alert('Error generating posts: ' + (error.response?.data?.error || error.message));
        }
        finally {
            setIsGeneratingPosts(false);
        }
    };
    // Step 5: Regenerate posts if user doesn't like them
    const handleRegeneratePosts = async () => {
        if (!generatedMetadata)
            return;
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
        }
        catch (error) {
            alert('Error regenerating posts: ' + (error.response?.data?.error || error.message));
        }
        finally {
            setIsGeneratingPosts(false);
        }
    };
    // Step 6: Publish selected post
    const handlePublish = async (scheduled = false) => {
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
            const publishData = {
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
        }
        catch (error) {
            alert('Error publishing post: ' + (error.response?.data?.error || error.message));
        }
        finally {
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
    return (_jsxs("div", { className: "max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6", children: [_jsxs("div", { className: "mb-8", children: [_jsx("div", { className: "flex items-center justify-between", children: [
                            { id: 'upload', label: '1. Upload' },
                            { id: 'explanation', label: '2. Explain' },
                            { id: 'metadata-review', label: '3. Review' },
                            { id: 'goal', label: '4. Goal' },
                            { id: 'post-selection', label: '5. Select' },
                            { id: 'publish', label: '6. Publish' },
                        ].map((step, index) => (_jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: `w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep === step.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`, children: index + 1 }), index < 5 && (_jsx("div", { className: "w-12 h-1 bg-gray-200 dark:bg-gray-700 mx-2" }))] }, step.id))) }), _jsx("div", { className: "flex items-center justify-between mt-2", children: [
                            'Upload',
                            'Explain',
                            'Review',
                            'Goal',
                            'Select',
                            'Publish',
                        ].map((label) => (_jsx("div", { className: "text-xs text-gray-500 dark:text-gray-400 w-20 text-center", children: label }, label))) })] }), currentStep === 'upload' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Step 1: Upload Your Video" }), _jsxs("div", { className: "border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center", children: [_jsx("input", { type: "file", ref: fileInputRef, onChange: handleFileSelect, accept: "video/mp4,video/quicktime,video/x-msvideo", className: "hidden" }), _jsx("button", { onClick: () => fileInputRef.current?.click(), className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold", children: "Select Video File" }), _jsx("p", { className: "mt-2 text-sm text-gray-500 dark:text-gray-400", children: "MP4, MOV, AVI (max 500MB)" })] }), videoPreview && isValidBlobUrl(videoPreview) && (_jsxs("div", { className: "mt-4", children: [_jsx("video", { src: videoPreview, controls: true, className: "w-full max-h-96 rounded-lg" }), _jsxs("p", { className: "mt-2 text-sm text-gray-600 dark:text-gray-400", children: ["Selected: ", videoFile?.name] }), uploadProgress > 0 && uploadProgress < 100 && (_jsxs("div", { className: "mt-4", children: [_jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full transition-all", style: { width: `${uploadProgress}%` } }) }), _jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: ["Uploading: ", uploadProgress, "%"] })] })), _jsx("button", { onClick: handleUpload, disabled: uploadProgress > 0 && uploadProgress < 100, className: "mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full", children: "Upload & Continue" })] }))] })), currentStep === 'explanation' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Step 2: Explain Your Video" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Describe what this video is about so Grok can generate a compelling title and description." }), _jsx("textarea", { value: userExplanation, onChange: (e) => setUserExplanation(e.target.value), placeholder: "Example: This video shows how to optimize React performance using memoization techniques. I demonstrate practical examples with before/after comparisons.", rows: 6, className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" }), _jsx("button", { onClick: handleGenerateMetadata, disabled: isGeneratingMetadata || !userExplanation.trim(), className: "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full", children: isGeneratingMetadata ? 'Generating with Grok AI...' : 'Generate Title & Description' })] })), currentStep === 'metadata-review' && generatedMetadata && (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Step 3: Review SEO-Optimized Metadata" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Grok AI has generated comprehensive SEO-optimized metadata for maximum discoverability." }), _jsxs("div", { className: "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800", children: [_jsxs("h3", { className: "font-semibold text-lg text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: "\uD83D\uDCF1" }), " Social Media Content"] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Title:" }), _jsx("p", { className: "text-gray-900 dark:text-white font-medium", children: generatedMetadata.title })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Description:" }), _jsx("p", { className: "text-gray-800 dark:text-gray-200", children: generatedMetadata.description })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Hashtags:" }), _jsx("div", { className: "flex flex-wrap gap-2 mt-1", children: generatedMetadata.suggestedHashtags.map((tag, idx) => (_jsxs("span", { className: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm", children: ["#", tag] }, idx))) })] })] })] }), _jsxs("div", { className: "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800", children: [_jsxs("h3", { className: "font-semibold text-lg text-green-900 dark:text-green-300 mb-3 flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: "\uD83D\uDD0D" }), " SEO Optimization"] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: ["SEO Title (", generatedMetadata.seoTitle.length, " chars):"] }), _jsx("p", { className: "text-gray-900 dark:text-white font-medium", children: generatedMetadata.seoTitle })] }), _jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: ["Meta Description (", generatedMetadata.seoDescription.length, " chars):"] }), _jsx("p", { className: "text-gray-800 dark:text-gray-200", children: generatedMetadata.seoDescription })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Target Keyword:" }), _jsx("p", { className: "text-green-700 dark:text-green-300 font-semibold", children: generatedMetadata.targetKeyword })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Category:" }), _jsx("p", { className: "text-gray-800 dark:text-gray-200", children: generatedMetadata.category })] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Keywords:" }), _jsx("div", { className: "flex flex-wrap gap-2 mt-1", children: generatedMetadata.keywords.map((keyword, idx) => (_jsx("span", { className: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-sm", children: keyword }, idx))) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Tags:" }), _jsx("div", { className: "flex flex-wrap gap-2 mt-1", children: generatedMetadata.tags.map((tag, idx) => (_jsx("span", { className: "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-1 rounded text-sm", children: tag }, idx))) })] })] })] }), _jsxs("div", { className: "bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800", children: [_jsxs("h3", { className: "font-semibold text-lg text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2", children: [_jsx("span", { className: "text-2xl", children: "\uD83C\uDFAF" }), " Search Discovery"] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Long-Tail Search Terms:" }), _jsx("ul", { className: "list-disc list-inside mt-1 space-y-1", children: generatedMetadata.searchTerms.map((term, idx) => (_jsxs("li", { className: "text-gray-800 dark:text-gray-200 text-sm", children: ["\"", term, "\""] }, idx))) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Voice Search Queries:" }), _jsx("ul", { className: "list-disc list-inside mt-1 space-y-1", children: generatedMetadata.voiceSearchQueries.map((query, idx) => (_jsxs("li", { className: "text-gray-800 dark:text-gray-200 text-sm", children: ["\"", query, "\""] }, idx))) })] })] })] }), _jsxs("div", { className: "flex gap-4", children: [_jsx("button", { onClick: handleRegenerateMetadata, disabled: isGeneratingMetadata, className: "flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold", children: isGeneratingMetadata ? 'Regenerating...' : 'Generate Another' }), _jsx("button", { onClick: handleAcceptMetadata, className: "flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold", children: "Accept & Continue" })] })] })), currentStep === 'goal' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Step 4: What's Your Goal?" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Describe what you want to achieve with this post. Grok will create optimized content in English and Spanish." }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Your Goal" }), _jsx("textarea", { value: userGoal, onChange: (e) => setUserGoal(e.target.value), placeholder: "Example: Increase product sales, attract followers from Asia, promote upcoming event, etc.", rows: 4, className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Target Audience (Optional)" }), _jsx("input", { type: "text", value: targetAudience, onChange: (e) => setTargetAudience(e.target.value), placeholder: "Example: Tech enthusiasts in Asia, Spanish-speaking entrepreneurs, etc.", className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" })] })] }), _jsx("button", { onClick: handleGeneratePosts, disabled: isGeneratingPosts || !userGoal.trim(), className: "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full", children: isGeneratingPosts ? 'Generating Posts with Grok AI...' : 'Generate Post Variants' })] })), currentStep === 'post-selection' && postVariants && (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Step 5: Choose Your Post" }), _jsx("p", { className: "text-red-600 dark:text-red-400 font-semibold", children: "\u26A0\uFE0F IMPORTANT: You can only publish in ONE language to avoid spam detection" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { onClick: () => setSelectedLanguage('en'), className: `p-6 rounded-lg border-2 cursor-pointer transition-all ${selectedLanguage === 'en'
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-300 dark:border-gray-600'}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-xl font-bold text-gray-900 dark:text-white", children: "English Version" }), selectedLanguage === 'en' && (_jsx("span", { className: "bg-blue-600 text-white px-3 py-1 rounded-full text-sm", children: "Selected" }))] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Content:" }), _jsx("p", { className: "text-gray-800 dark:text-gray-200 mt-1", children: postVariants.english.content })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Hashtags:" }), _jsx("div", { className: "flex flex-wrap gap-2 mt-1", children: postVariants.english.hashtags.map((tag, idx) => (_jsxs("span", { className: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm", children: ["#", tag] }, idx))) })] }), postVariants.english.cta && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "CTA:" }), _jsx("p", { className: "text-gray-800 dark:text-gray-200 mt-1", children: postVariants.english.cta })] }))] })] }), _jsxs("div", { onClick: () => setSelectedLanguage('es'), className: `p-6 rounded-lg border-2 cursor-pointer transition-all ${selectedLanguage === 'es'
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-300 dark:border-gray-600'}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-xl font-bold text-gray-900 dark:text-white", children: "Spanish Version" }), selectedLanguage === 'es' && (_jsx("span", { className: "bg-blue-600 text-white px-3 py-1 rounded-full text-sm", children: "Seleccionado" }))] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Contenido:" }), _jsx("p", { className: "text-gray-800 dark:text-gray-200 mt-1", children: postVariants.spanish.content })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "Hashtags:" }), _jsx("div", { className: "flex flex-wrap gap-2 mt-1", children: postVariants.spanish.hashtags.map((tag, idx) => (_jsxs("span", { className: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm", children: ["#", tag] }, idx))) })] }), postVariants.spanish.cta && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300", children: "CTA:" }), _jsx("p", { className: "text-gray-800 dark:text-gray-200 mt-1", children: postVariants.spanish.cta })] }))] })] })] }), _jsxs("div", { className: "flex gap-4", children: [_jsx("button", { onClick: handleRegeneratePosts, disabled: isGeneratingPosts, className: "flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold", children: isGeneratingPosts ? 'Regenerating...' : 'Generate Different Posts' }), _jsx("button", { onClick: () => handlePublish(false), disabled: !selectedLanguage || isPublishing, className: "flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold", children: isPublishing ? 'Publishing...' : 'Publish Now' })] })] })), currentStep === 'publish' && publishSuccess && (_jsxs("div", { className: "text-center space-y-4", children: [_jsx("div", { className: "text-6xl", children: "\uD83C\uDF89" }), _jsx("h2", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: "Video Published Successfully!" }), _jsxs("p", { className: "text-gray-600 dark:text-gray-400", children: ["Your video has been published in ", selectedLanguage === 'en' ? 'English' : 'Spanish', "."] }), _jsx("button", { onClick: handleReset, className: "bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold", children: "Upload Another Video" })] }))] }));
}
