import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';

interface TelegramChannel {
  id: string;
  chatId: string;
  title: string;
  type: 'channel' | 'group' | 'supergroup';
  username?: string;
}

interface BroadcastResult {
  channelId: string;
  channelTitle: string;
  success: boolean;
  messageId?: number;
  error?: string;
}

type Tab = 'broadcast' | 'channels';

export function TelegramBroadcaster() {
  const [activeTab, setActiveTab] = useState<Tab>('broadcast');

  // Broadcast state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [telegramFileId, setTelegramFileId] = useState<string>('');

  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [userGoal, setUserGoal] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [language, setLanguage] = useState<'en' | 'es'>('es');

  const [generatedCaption, setGeneratedCaption] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [broadcastResults, setBroadcastResults] = useState<BroadcastResult[] | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Channels state
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [newChannelChatId, setNewChannelChatId] = useState('');
  const [newChannelTitle, setNewChannelTitle] = useState('');
  const [newChannelType, setNewChannelType] = useState<'channel' | 'group' | 'supergroup'>('channel');
  const [newChannelUsername, setNewChannelUsername] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch (error: any) {
      console.error('Error loading channels:', error);
    }
  };

  // Handle video file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  // Upload video to Telegram
  const handleUploadToTelegram = async () => {
    if (!videoFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('supportsStreaming', 'true');

      const response = await api.post('/telegram/upload-video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          );
          setUploadProgress(percentCompleted);
        },
      });

      if (response.data.success) {
        setTelegramFileId(response.data.result.fileId);
        alert('✅ Video uploaded to Telegram successfully!');
      }
    } catch (error: any) {
      alert('Error uploading video: ' + (error.response?.data?.error || error.message));
    } finally {
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
    } catch (error: any) {
      alert('Error generating description: ' + (error.response?.data?.error || error.message));
    } finally {
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
      const selectedChannelObjects = channels.filter((c) =>
        selectedChannels.includes(c.id)
      );

      const response = await api.post('/telegram/broadcast-video', {
        videoFileId: telegramFileId,
        caption: generatedCaption,
        channels: selectedChannelObjects,
        parseMode: 'HTML',
      });

      if (response.data.success) {
        setBroadcastResults(response.data.results);
        alert(
          `✅ Broadcast completed!\n${response.data.summary.successful} successful, ${response.data.summary.failed} failed`
        );
      }
    } catch (error: any) {
      alert('Error broadcasting: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Toggle channel selection
  const toggleChannelSelection = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  // Add new channel
  const handleAddChannel = async (e: React.FormEvent) => {
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
    } catch (error: any) {
      alert('Error adding channel: ' + (error.response?.data?.error || error.message));
    }
  };

  // Remove channel
  const handleRemoveChannel = async (channelId: string) => {
    if (!confirm('Are you sure you want to remove this channel?')) return;

    try {
      await api.delete(`/telegram/channels/${channelId}`);
      alert('Channel removed');
      loadChannels();
    } catch (error: any) {
      alert('Error removing channel: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📢 Telegram Broadcaster
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Upload videos to Telegram and broadcast to multiple channels/groups with AI-generated descriptions
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'broadcast'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Broadcast Video
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'channels'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Manage Channels ({channels.length})
          </button>
        </nav>
      </div>

      {/* Broadcast Tab */}
      {activeTab === 'broadcast' && (
        <div className="space-y-6">
          {/* Step 1: Upload Video */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
              Step 1: Upload Video to Telegram
            </h3>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="video/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
              >
                Select Video
              </button>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Telegram supports videos up to 2GB with long duration
              </p>
            </div>

            {videoPreview && (
              <div className="mt-4">
                <video src={videoPreview} controls className="w-full max-h-64 rounded-lg" />
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Selected: {videoFile?.name}
                </p>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Uploading to Telegram: {uploadProgress}%
                    </p>
                  </div>
                )}

                {!telegramFileId && (
                  <button
                    onClick={handleUploadToTelegram}
                    disabled={isUploading}
                    className="mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold w-full"
                  >
                    {isUploading ? 'Uploading...' : 'Upload to Telegram'}
                  </button>
                )}

                {telegramFileId && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <p className="text-green-700 dark:text-green-300 font-semibold">
                      ✅ Uploaded to Telegram!
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 break-all">
                      File ID: {telegramFileId}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Generate Description */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
              Step 2: Generate Description with Grok AI
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Video Title
                </label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Enter video title"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Video Description
                </label>
                <textarea
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Describe what the video is about..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Goal
                </label>
                <input
                  type="text"
                  value={userGoal}
                  onChange={(e) => setUserGoal(e.target.value)}
                  placeholder="e.g., Get more subscribers, promote product"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target Audience (Optional)
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., Spanish speakers"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  >
                    <option value="es">Spanish</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateDescription}
                disabled={isGenerating || !videoTitle || !videoDescription || !userGoal}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold w-full"
              >
                {isGenerating ? 'Generating with Grok AI...' : 'Generate Caption'}
              </button>

              {generatedCaption && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <label className="block text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
                    Generated Caption (editable):
                  </label>
                  <textarea
                    value={generatedCaption}
                    onChange={(e) => setGeneratedCaption(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-green-300 dark:border-green-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {generatedCaption.length} / 1024 characters
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Select Channels & Broadcast */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
              Step 3: Select Channels & Broadcast
            </h3>

            {channels.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">
                No channels configured. Go to "Manage Channels" tab to add channels.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {channels.map((channel) => (
                  <label
                    key={channel.id}
                    className="flex items-center p-3 bg-white dark:bg-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-550 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedChannels.includes(channel.id)}
                      onChange={() => toggleChannelSelection(channel.id)}
                      className="mr-3 h-4 w-4"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{channel.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {channel.chatId} • {channel.type}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <button
              onClick={handleBroadcast}
              disabled={
                isBroadcasting ||
                !telegramFileId ||
                !generatedCaption ||
                selectedChannels.length === 0
              }
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold w-full"
            >
              {isBroadcasting
                ? 'Broadcasting...'
                : `Broadcast to ${selectedChannels.length} Channel(s)`}
            </button>
          </div>

          {/* Broadcast Results */}
          {broadcastResults && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
                Broadcast Results
              </h3>
              <div className="space-y-2">
                {broadcastResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded ${
                      result.success
                        ? 'bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700'
                        : 'bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {result.success ? '✅' : '❌'} {result.channelTitle}
                    </p>
                    {result.success && result.messageId && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Message ID: {result.messageId}
                      </p>
                    )}
                    {!result.success && result.error && (
                      <p className="text-xs text-red-600 dark:text-red-400">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Channels Management Tab */}
      {activeTab === 'channels' && (
        <div className="space-y-6">
          {/* Add Channel Form */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
              Add New Channel/Group
            </h3>
            <form onSubmit={handleAddChannel} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chat ID
                </label>
                <input
                  type="text"
                  value={newChannelChatId}
                  onChange={(e) => setNewChannelChatId(e.target.value)}
                  placeholder="@channelname or numeric ID"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Bot must be admin in this channel/group
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newChannelTitle}
                  onChange={(e) => setNewChannelTitle(e.target.value)}
                  placeholder="Channel name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={newChannelType}
                    onChange={(e) => setNewChannelType(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  >
                    <option value="channel">Channel</option>
                    <option value="group">Group</option>
                    <option value="supergroup">Supergroup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={newChannelUsername}
                    onChange={(e) => setNewChannelUsername(e.target.value)}
                    placeholder="channelname"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold w-full"
              >
                Add Channel
              </button>
            </form>
          </div>

          {/* Channels List */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
              Your Channels ({channels.length})
            </h3>
            {channels.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No channels added yet</p>
            ) : (
              <div className="space-y-2">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-600 rounded"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{channel.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {channel.chatId} • {channel.type}
                        {channel.username && ` • @${channel.username}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveChannel(channel.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
