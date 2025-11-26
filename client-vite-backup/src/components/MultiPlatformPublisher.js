import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { api } from '../services/api';
export const MultiPlatformPublisher = ({ postId, videoMetadata = {}, onPublishSuccess, onPublishError, }) => {
    const [selectedPlatforms, setSelectedPlatforms] = useState([]);
    const [twitterAccounts, setTwitterAccounts] = useState([]);
    const [selectedTwitterAccount, setSelectedTwitterAccount] = useState('');
    const [telegramChannels, setTelegramChannels] = useState([]);
    const [selectedTelegramChannels, setSelectedTelegramChannels] = useState([]);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const [publishResults, setPublishResults] = useState(null);
    useEffect(() => {
        loadTwitterAccounts();
        loadTelegramChannels();
        generateDefaultCaption();
    }, [videoMetadata]);
    const loadTwitterAccounts = async () => {
        try {
            const response = await api.get('/platform-accounts?platform=twitter');
            if (response.data.success) {
                setTwitterAccounts(response.data.accounts || []);
            }
        }
        catch (error) {
            console.error('Failed to load Twitter accounts:', error);
        }
    };
    const loadTelegramChannels = async () => {
        try {
            const response = await api.get('/telegram/channels');
            if (response.data.success) {
                setTelegramChannels(response.data.channels || []);
            }
        }
        catch (error) {
            console.error('Failed to load Telegram channels:', error);
        }
    };
    const generateDefaultCaption = () => {
        const { title, description, hashtags } = videoMetadata;
        let defaultCaption = '';
        if (title) {
            defaultCaption += `${title}\n\n`;
        }
        if (description) {
            defaultCaption += `${description}\n\n`;
        }
        if (hashtags && hashtags.length > 0) {
            defaultCaption += hashtags.join(' ');
        }
        setCaption(defaultCaption.trim());
    };
    const handlePlatformToggle = (platform) => {
        if (selectedPlatforms.includes(platform)) {
            setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
        }
        else {
            setSelectedPlatforms([...selectedPlatforms, platform]);
        }
    };
    const handleTelegramChannelToggle = (channelId) => {
        if (selectedTelegramChannels.includes(channelId)) {
            setSelectedTelegramChannels(selectedTelegramChannels.filter((id) => id !== channelId));
        }
        else {
            setSelectedTelegramChannels([...selectedTelegramChannels, channelId]);
        }
    };
    const handlePublish = async () => {
        if (selectedPlatforms.length === 0) {
            onPublishError?.('Please select at least one platform');
            return;
        }
        if (selectedPlatforms.includes('twitter') && !selectedTwitterAccount) {
            onPublishError?.('Please select a Twitter account');
            return;
        }
        if (selectedPlatforms.includes('telegram') && selectedTelegramChannels.length === 0) {
            onPublishError?.('Please select at least one Telegram channel');
            return;
        }
        setLoading(true);
        setPublishResults(null);
        try {
            const response = await api.post(`/video/${postId}/publish-multi-platform`, {
                platforms: selectedPlatforms,
                twitterAccountId: selectedTwitterAccount || undefined,
                telegramChannelIds: selectedTelegramChannels.length > 0 ? selectedTelegramChannels : undefined,
                caption,
                videoMetadata,
            });
            if (response.data.success) {
                setPublishResults(response.data);
                onPublishSuccess?.(response.data);
            }
            else {
                onPublishError?.(response.data.error || 'Failed to publish');
            }
        }
        catch (error) {
            console.error('Publish error:', error);
            onPublishError?.(error.response?.data?.error || 'Failed to publish to platforms');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white mb-6", children: "Publish to Multiple Platforms" }), _jsxs("div", { className: "mb-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-3", children: "Select Platforms" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("input", { type: "checkbox", id: "platform-twitter", checked: selectedPlatforms.includes('twitter'), onChange: () => handlePlatformToggle('twitter'), className: "w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" }), _jsx("label", { htmlFor: "platform-twitter", className: "ml-2 text-sm font-medium text-gray-900 dark:text-gray-300", children: _jsxs("span", { className: "flex items-center", children: [_jsx("svg", { className: "w-5 h-5 mr-2 text-blue-400", fill: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { d: "M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" }) }), "Twitter / X"] }) })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("input", { type: "checkbox", id: "platform-telegram", checked: selectedPlatforms.includes('telegram'), onChange: () => handlePlatformToggle('telegram'), className: "w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" }), _jsx("label", { htmlFor: "platform-telegram", className: "ml-2 text-sm font-medium text-gray-900 dark:text-gray-300", children: _jsxs("span", { className: "flex items-center", children: [_jsx("svg", { className: "w-5 h-5 mr-2 text-blue-500", fill: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { d: "M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" }) }), "Telegram"] }) })] })] })] }), selectedPlatforms.includes('twitter') && (_jsxs("div", { className: "mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-3", children: "Select Twitter Account" }), twitterAccounts.length === 0 ? (_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "No Twitter accounts connected. Please connect an account in Settings." })) : (_jsxs("select", { value: selectedTwitterAccount, onChange: (e) => setSelectedTwitterAccount(e.target.value), className: "w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white", children: [_jsx("option", { value: "", children: "Select an account..." }), twitterAccounts.map((account) => (_jsxs("option", { value: account.id, children: ["@", account.username] }, account.id)))] }))] })), selectedPlatforms.includes('telegram') && (_jsxs("div", { className: "mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-3", children: "Select Telegram Channels" }), telegramChannels.length === 0 ? (_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "No Telegram channels configured. Please add channels in the Telegram page." })) : (_jsx("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: telegramChannels.map((channel) => (_jsxs("div", { className: "flex items-center", children: [_jsx("input", { type: "checkbox", id: `channel-${channel.id}`, checked: selectedTelegramChannels.includes(channel.id), onChange: () => handleTelegramChannelToggle(channel.id), className: "w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" }), _jsxs("label", { htmlFor: `channel-${channel.id}`, className: "ml-2 text-sm font-medium text-gray-900 dark:text-gray-300", children: [channel.title, _jsxs("span", { className: "ml-2 text-xs text-gray-500", children: ["(", channel.type, ")"] })] })] }, channel.id))) })), selectedTelegramChannels.length > 0 && (_jsxs("p", { className: "mt-2 text-sm text-gray-600 dark:text-gray-400", children: ["Selected: ", selectedTelegramChannels.length, " channel(s)"] }))] })), _jsxs("div", { className: "mb-6", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: ["Post Caption", _jsxs("span", { className: "ml-2 text-xs text-gray-500", children: ["(", caption.length, " characters)"] })] }), _jsx("textarea", { value: caption, onChange: (e) => setCaption(e.target.value), rows: 6, className: "w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white", placeholder: "Enter your post caption with hashtags..." }), _jsx("p", { className: "mt-1 text-xs text-gray-500 dark:text-gray-400", children: "This caption will be used for both platforms. Optimize for engagement!" })] }), _jsx("button", { onClick: handlePublish, disabled: loading || selectedPlatforms.length === 0, className: `w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${loading || selectedPlatforms.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'}`, children: loading ? (_jsxs("span", { className: "flex items-center justify-center", children: [_jsxs("svg", { className: "animate-spin -ml-1 mr-3 h-5 w-5 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), "Publishing to ", selectedPlatforms.length, " platform(s)..."] })) : (`Publish to ${selectedPlatforms.length > 0 ? selectedPlatforms.join(' + ').toUpperCase() : 'Platforms'}`) }), publishResults && (_jsxs("div", { className: "mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-3", children: "Publish Results" }), publishResults.totalSuccess > 0 && (_jsx("div", { className: "mb-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg", children: _jsxs("p", { className: "text-green-800 dark:text-green-200 font-medium", children: ["\u2705 Successfully published to ", publishResults.totalSuccess, " platform(s)"] }) })), publishResults.totalFailed > 0 && (_jsx("div", { className: "mb-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg", children: _jsxs("p", { className: "text-red-800 dark:text-red-200 font-medium", children: ["\u274C Failed to publish to ", publishResults.totalFailed, " platform(s)"] }) })), _jsx("div", { className: "space-y-2", children: publishResults.results?.map((result, index) => (_jsxs("div", { className: `p-3 rounded-lg ${result.success
                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-medium text-gray-900 dark:text-white capitalize", children: result.platform }), _jsx("span", { className: result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400', children: result.success ? '✓ Success' : '✗ Failed' })] }), result.success && result.platformPostId && (_jsxs("p", { className: "mt-1 text-xs text-gray-600 dark:text-gray-400", children: ["Post ID: ", result.platformPostId] })), result.success && result.details?.successCount && (_jsxs("p", { className: "mt-1 text-xs text-gray-600 dark:text-gray-400", children: ["Sent to ", result.details.successCount, " of ", result.details.totalChannels, " channels"] })), !result.success && result.error && (_jsxs("p", { className: "mt-1 text-xs text-red-600 dark:text-red-400", children: ["Error: ", result.error] }))] }, index))) })] }))] }));
};
