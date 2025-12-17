import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
export function TelegramBroadcaster() {
    const [activeTab, setActiveTab] = useState('broadcast');
    // Broadcast state
    const [videoFile, setVideoFile] = useState(null);
    const [videoPreview, setVideoPreview] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [telegramFileId, setTelegramFileId] = useState('');
    const [videoTitle, setVideoTitle] = useState('');
    const [videoDescription, setVideoDescription] = useState('');
    const [userGoal, setUserGoal] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    const [language, setLanguage] = useState('es');
    const [generatedCaption, setGeneratedCaption] = useState('');
    const [selectedChannels, setSelectedChannels] = useState([]);
    const [broadcastResults, setBroadcastResults] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    // Channels state
    const [channels, setChannels] = useState([]);
    const [newChannelChatId, setNewChannelChatId] = useState('');
    const [newChannelTitle, setNewChannelTitle] = useState('');
    const [newChannelType, setNewChannelType] = useState('channel');
    const [newChannelUsername, setNewChannelUsername] = useState('');
    const fileInputRef = useRef(null);
    // Load channels on mount
    useEffect(() => {
        loadChannels();
    }, []);
    const loadChannels = async () => {
        try {
            const response = await api.get('/telegram/channels');
            if (response.data.success) {
                setChannels(response.data.channels);
            }
        }
        catch (error) {
            console.error('Error loading channels:', error);
        }
    };
    // Handle video file selection
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
    };
    // Upload video to Telegram
    const handleUploadToTelegram = async () => {
        if (!videoFile)
            return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('supportsStreaming', 'true');
            const response = await api.post('/telegram/upload-video', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
                    setUploadProgress(percentCompleted);
                },
            });
            if (response.data.success) {
                setTelegramFileId(response.data.result.fileId);
                alert('✅ Video uploaded to Telegram successfully!');
            }
        }
        catch (error) {
            alert('Error uploading video: ' + (error.response?.data?.error || error.message));
        }
        finally {
            setIsUploading(false);
        }
    };
    // Generate description with Grok
    const handleGenerateDescription = async () => {
        if (!videoTitle || !videoDescription || !userGoal) {
            alert('Please fill in video title, description, and goal');
            return;
        }
        setIsGenerating(true);
        try {
            const response = await api.post('/telegram/generate-description', {
                videoTitle,
                videoDescription,
                targetAudience,
                goal: userGoal,
                language,
            });
            if (response.data.success) {
                setGeneratedCaption(response.data.description.caption);
            }
        }
        catch (error) {
            alert('Error generating description: ' + (error.response?.data?.error || error.message));
        }
        finally {
            setIsGenerating(false);
        }
    };
    // Broadcast video to selected channels
    const handleBroadcast = async () => {
        if (!telegramFileId) {
            alert('Please upload video to Telegram first');
            return;
        }
        if (!generatedCaption) {
            alert('Please generate a caption first');
            return;
        }
        if (selectedChannels.length === 0) {
            alert('Please select at least one channel');
            return;
        }
        setIsBroadcasting(true);
        try {
            const selectedChannelObjects = channels.filter((c) => selectedChannels.includes(c.id));
            const response = await api.post('/telegram/broadcast-video', {
                videoFileId: telegramFileId,
                caption: generatedCaption,
                channels: selectedChannelObjects,
                parseMode: 'HTML',
            });
            if (response.data.success) {
                setBroadcastResults(response.data.results);
                alert(`✅ Broadcast completed!\n${response.data.summary.successful} successful, ${response.data.summary.failed} failed`);
            }
        }
        catch (error) {
            alert('Error broadcasting: ' + (error.response?.data?.error || error.message));
        }
        finally {
            setIsBroadcasting(false);
        }
    };
    // Toggle channel selection
    const toggleChannelSelection = (channelId) => {
        setSelectedChannels((prev) => prev.includes(channelId)
            ? prev.filter((id) => id !== channelId)
            : [...prev, channelId]);
    };
    // Add new channel
    const handleAddChannel = async (e) => {
        e.preventDefault();
        if (!newChannelChatId || !newChannelTitle) {
            alert('Chat ID and title are required');
            return;
        }
        try {
            const response = await api.post('/telegram/channels', {
                chatId: newChannelChatId,
                title: newChannelTitle,
                type: newChannelType,
                username: newChannelUsername || undefined,
            });
            if (response.data.success) {
                alert('✅ Channel added successfully!');
                setNewChannelChatId('');
                setNewChannelTitle('');
                setNewChannelUsername('');
                loadChannels();
            }
        }
        catch (error) {
            alert('Error adding channel: ' + (error.response?.data?.error || error.message));
        }
    };
    // Remove channel
    const handleRemoveChannel = async (channelId) => {
        if (!confirm('Are you sure you want to remove this channel?'))
            return;
        try {
            await api.delete(`/telegram/channels/${channelId}`);
            alert('Channel removed');
            loadChannels();
        }
        catch (error) {
            alert('Error removing channel: ' + (error.response?.data?.error || error.message));
        }
    };
    return (_jsxs("div", { className: "max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-3xl font-bold text-gray-900 dark:text-white mb-2", children: "\uD83D\uDCE2 Telegram Broadcaster" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Upload videos to Telegram and broadcast to multiple channels/groups with AI-generated descriptions" })] }), _jsx("div", { className: "border-b border-gray-200 dark:border-gray-700 mb-6", children: _jsxs("nav", { className: "-mb-px flex space-x-8", children: [_jsx("button", { onClick: () => setActiveTab('broadcast'), className: `py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'broadcast'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`, children: "Broadcast Video" }), _jsxs("button", { onClick: () => setActiveTab('channels'), className: `py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'channels'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`, children: ["Manage Channels (", channels.length, ")"] })] }) }), activeTab === 'broadcast' && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "p-4 bg-gray-50 dark:bg-gray-700 rounded-lg", children: [_jsx("h3", { className: "font-semibold text-lg text-gray-900 dark:text-white mb-3", children: "Step 1: Upload Video to Telegram" }), _jsxs("div", { className: "border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center", children: [_jsx("input", { type: "file", ref: fileInputRef, onChange: handleFileSelect, accept: "video/*", className: "hidden" }), _jsx("button", { onClick: () => fileInputRef.current?.click(), className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold", children: "Select Video" }), _jsx("p", { className: "mt-2 text-sm text-gray-500 dark:text-gray-400", children: "Telegram supports videos up to 2GB with long duration" })] }), videoPreview && (_jsxs("div", { className: "mt-4", children: [_jsx("video", { src: videoPreview, controls: true, className: "w-full max-h-64 rounded-lg" }), _jsxs("p", { className: "mt-2 text-sm text-gray-600 dark:text-gray-400", children: ["Selected: ", videoFile?.name] }), uploadProgress > 0 && uploadProgress < 100 && (_jsxs("div", { className: "mt-4", children: [_jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full transition-all", style: { width: `${uploadProgress}%` } }) }), _jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: ["Uploading to Telegram: ", uploadProgress, "%"] })] })), !telegramFileId && (_jsx("button", { onClick: handleUploadToTelegram, disabled: isUploading, className: "mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold w-full", children: isUploading ? 'Uploading...' : 'Upload to Telegram' })), telegramFileId && (_jsxs("div", { className: "mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800", children: [_jsx("p", { className: "text-green-700 dark:text-green-300 font-semibold", children: "\u2705 Uploaded to Telegram!" }), _jsxs("p", { className: "text-xs text-gray-600 dark:text-gray-400 mt-1 break-all", children: ["File ID: ", telegramFileId] })] }))] }))] }), _jsxs("div", { className: "p-4 bg-gray-50 dark:bg-gray-700 rounded-lg", children: [_jsx("h3", { className: "font-semibold text-lg text-gray-900 dark:text-white mb-3", children: "Step 2: Generate Description with Grok AI" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Video Title" }), _jsx("input", { type: "text", value: videoTitle, onChange: (e) => setVideoTitle(e.target.value), placeholder: "Enter video title", className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Video Description" }), _jsx("textarea", { value: videoDescription, onChange: (e) => setVideoDescription(e.target.value), placeholder: "Describe what the video is about...", rows: 3, className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Your Goal" }), _jsx("input", { type: "text", value: userGoal, onChange: (e) => setUserGoal(e.target.value), placeholder: "e.g., Get more subscribers, promote product", className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Target Audience (Optional)" }), _jsx("input", { type: "text", value: targetAudience, onChange: (e) => setTargetAudience(e.target.value), placeholder: "e.g., Spanish speakers", className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Language" }), _jsxs("select", { value: language, onChange: (e) => setLanguage(e.target.value), className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white", children: [_jsx("option", { value: "es", children: "Spanish" }), _jsx("option", { value: "en", children: "English" })] })] })] }), _jsx("button", { onClick: handleGenerateDescription, disabled: isGenerating || !videoTitle || !videoDescription || !userGoal, className: "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold w-full", children: isGenerating ? 'Generating with Grok AI...' : 'Generate Caption' }), generatedCaption && (_jsxs("div", { className: "mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800", children: [_jsx("label", { className: "block text-sm font-semibold text-green-700 dark:text-green-300 mb-2", children: "Generated Caption (editable):" }), _jsx("textarea", { value: generatedCaption, onChange: (e) => setGeneratedCaption(e.target.value), rows: 6, className: "w-full px-3 py-2 border border-green-300 dark:border-green-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" }), _jsxs("p", { className: "text-xs text-gray-600 dark:text-gray-400 mt-1", children: [generatedCaption.length, " / 1024 characters"] })] }))] })] }), _jsxs("div", { className: "p-4 bg-gray-50 dark:bg-gray-700 rounded-lg", children: [_jsx("h3", { className: "font-semibold text-lg text-gray-900 dark:text-white mb-3", children: "Step 3: Select Channels & Broadcast" }), channels.length === 0 ? (_jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "No channels configured. Go to \"Manage Channels\" tab to add channels." })) : (_jsx("div", { className: "space-y-2 mb-4", children: channels.map((channel) => (_jsxs("label", { className: "flex items-center p-3 bg-white dark:bg-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-550 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: selectedChannels.includes(channel.id), onChange: () => toggleChannelSelection(channel.id), className: "mr-3 h-4 w-4" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-900 dark:text-white", children: channel.title }), _jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: [channel.chatId, " \u2022 ", channel.type] })] })] }, channel.id))) })), _jsx("button", { onClick: handleBroadcast, disabled: isBroadcasting ||
                                    !telegramFileId ||
                                    !generatedCaption ||
                                    selectedChannels.length === 0, className: "bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full", children: isBroadcasting
                                    ? 'Broadcasting...'
                                    : `Broadcast to ${selectedChannels.length} Channel(s)` })] }), broadcastResults && (_jsxs("div", { className: "p-4 bg-gray-50 dark:bg-gray-700 rounded-lg", children: [_jsx("h3", { className: "font-semibold text-lg text-gray-900 dark:text-white mb-3", children: "Broadcast Results" }), _jsx("div", { className: "space-y-2", children: broadcastResults.map((result, idx) => (_jsxs("div", { className: `p-3 rounded ${result.success
                                        ? 'bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700'
                                        : 'bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700'}`, children: [_jsxs("p", { className: "font-medium text-gray-900 dark:text-white", children: [result.success ? '✅' : '❌', " ", result.channelTitle] }), result.success && result.messageId && (_jsxs("p", { className: "text-xs text-gray-600 dark:text-gray-400", children: ["Message ID: ", result.messageId] })), !result.success && result.error && (_jsx("p", { className: "text-xs text-red-600 dark:text-red-400", children: result.error }))] }, idx))) })] }))] })), activeTab === 'channels' && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "p-4 bg-gray-50 dark:bg-gray-700 rounded-lg", children: [_jsx("h3", { className: "font-semibold text-lg text-gray-900 dark:text-white mb-3", children: "Add New Channel/Group" }), _jsxs("form", { onSubmit: handleAddChannel, className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Chat ID" }), _jsx("input", { type: "text", value: newChannelChatId, onChange: (e) => setNewChannelChatId(e.target.value), placeholder: "@channelname or numeric ID", className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white", required: true }), _jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1", children: "Bot must be admin in this channel/group" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Title" }), _jsx("input", { type: "text", value: newChannelTitle, onChange: (e) => setNewChannelTitle(e.target.value), placeholder: "Channel name", className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white", required: true })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Type" }), _jsxs("select", { value: newChannelType, onChange: (e) => setNewChannelType(e.target.value), className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white", children: [_jsx("option", { value: "channel", children: "Channel" }), _jsx("option", { value: "group", children: "Group" }), _jsx("option", { value: "supergroup", children: "Supergroup" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Username (Optional)" }), _jsx("input", { type: "text", value: newChannelUsername, onChange: (e) => setNewChannelUsername(e.target.value), placeholder: "channelname", className: "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white" })] })] }), _jsx("button", { type: "submit", className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold w-full", children: "Add Channel" })] })] }), _jsxs("div", { className: "p-4 bg-gray-50 dark:bg-gray-700 rounded-lg", children: [_jsxs("h3", { className: "font-semibold text-lg text-gray-900 dark:text-white mb-3", children: ["Your Channels (", channels.length, ")"] }), channels.length === 0 ? (_jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "No channels added yet" })) : (_jsx("div", { className: "space-y-2", children: channels.map((channel) => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-white dark:bg-gray-600 rounded", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-900 dark:text-white", children: channel.title }), _jsxs("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: [channel.chatId, " \u2022 ", channel.type, channel.username && ` • @${channel.username}`] })] }), _jsx("button", { onClick: () => handleRemoveChannel(channel.id), className: "text-red-600 hover:text-red-700 dark:text-red-400 font-medium text-sm", children: "Remove" })] }, channel.id))) }))] })] }))] }));
}
