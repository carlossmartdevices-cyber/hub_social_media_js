# Telegram API Implementation

## Overview

The Telegram API implementation provides comprehensive functionality for sending messages, managing media, and handling live streams through the Telegram Bot API. This implementation includes three main components:

- **TelegramAPIClient**: Core API wrapper for Telegram Bot API
- **TelegramMessageManager**: High-level message management
- **TelegramLiveManager**: Live streaming and broadcast management

## Setup

### 1. Create a Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Copy the bot token provided

### 2. Configure Environment

Add to your `.env` file:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_DEFAULT_CHAT_ID=@your_channel_or_chat_id  # Optional
```

### 3. Get Chat ID

To send messages, you need a chat ID:

- For channels: Use `@channel_username`
- For groups: Add your bot to the group and use group ID
- For private chats: Use [@userinfobot](https://t.me/userinfobot) to get your chat ID

## Usage

### Basic Message Sending

```javascript
const HubManager = require('./src/core/hubManager');
const hub = new HubManager();

// Send a basic message
await hub.sendMessage('telegram', 'Hello World!', {
  chatId: '@your_channel'
});

// Send with formatting
await hub.sendMessage('telegram', '<b>Bold</b> and <i>italic</i> text', {
  chatId: '@your_channel',
  parseMode: 'HTML'
});
```

### Media Messages

```javascript
const TelegramMessageManager = require('./src/platforms/telegram/messageManager');
const messageManager = new TelegramMessageManager();

// Send photo
await messageManager.sendMediaMessage(
  '@your_channel',
  './path/to/image.jpg',
  'photo',
  { caption: 'Check out this image!' }
);

// Send video
await messageManager.sendMediaMessage(
  '@your_channel',
  './path/to/video.mp4',
  'video',
  { caption: 'Amazing video content!' }
);

// Send multiple media (album)
await messageManager.sendMediaGroup('@your_channel', [
  { type: 'photo', media: './image1.jpg', caption: 'First image' },
  { type: 'photo', media: './image2.jpg', caption: 'Second image' }
]);
```

### Live Streaming

```javascript
const TelegramLiveManager = require('./src/platforms/telegram/liveManager');
const liveManager = new TelegramLiveManager();

// Start live stream
const liveResult = await liveManager.startLiveStream('@your_channel', {
  title: 'My Live Stream',
  description: 'Join us for an amazing live session!',
  autoPin: true,
  createInviteLink: true
});

// Send live updates
await liveManager.sendLiveUpdate('@your_channel', 
  'We have 100 viewers now! Thank you for joining!'
);

// End live stream
await liveManager.endLiveStream('@your_channel', {
  sendEndMessage: true,
  unpinAnnouncement: true
});
```

### Content Scheduling

```javascript
const ContentScheduler = require('./src/core/contentScheduler');
const scheduler = new ContentScheduler(hub);

// Schedule a message
const scheduledTime = new Date(Date.now() + 3600000); // 1 hour from now
await scheduler.scheduleContent(
  'telegram',
  'This is a scheduled message!',
  scheduledTime,
  { chatId: '@your_channel' }
);
```

## API Methods

### TelegramAPIClient

Core API wrapper methods:

- `sendMessage(message, options)` - Send text messages
- `sendPhoto(chatId, photo, options)` - Send photos
- `sendVideo(chatId, video, options)` - Send videos  
- `sendDocument(chatId, document, options)` - Send files
- `sendMediaGroup(chatId, media, options)` - Send media albums
- `editMessage(chatId, messageId, text, options)` - Edit messages
- `deleteMessage(chatId, messageId)` - Delete messages
- `getChatInfo(chatId)` - Get chat information
- `createChatInviteLink(chatId, options)` - Create invite links
- `pinMessage(chatId, messageId)` - Pin messages
- `getBotInfo()` - Get bot information

### TelegramMessageManager

High-level message management:

- `sendTextMessage(chatId, message, options)` - Send formatted text
- `sendMediaMessage(chatId, mediaPath, mediaType, options)` - Send media files
- `sendMediaGroup(chatId, mediaItems, options)` - Send media albums
- `sendFormattedMessage(chatId, messageData, options)` - Send with formatting entities
- `editMessage(chatId, messageId, newText, options)` - Edit existing messages
- `deleteMessage(chatId, messageId)` - Delete messages
- `forwardMessage(fromChatId, toChatId, messageId)` - Forward messages
- `sendReplyMessage(chatId, replyToMessageId, message)` - Reply to messages
- `pinMessage(chatId, messageId)` - Pin important messages

### TelegramLiveManager

Live streaming management:

- `startLiveStream(chatId, options)` - Start live broadcasts
- `endLiveStream(chatId, options)` - End live broadcasts
- `updateLiveStreamInfo(chatId, updates)` - Update stream information
- `getLiveStreamInfo(chatId)` - Get current stream status
- `getAllActiveLiveStreams()` - Get all active streams
- `sendLiveUpdate(chatId, updateMessage, options)` - Send live updates
- `createLiveStreamInvite(chatId, options)` - Create stream invite links

## Message Formatting

Telegram supports several formatting options:

### HTML Formatting

```javascript
await hub.sendMessage('telegram', 
  '<b>Bold</b>, <i>italic</i>, <u>underline</u>, <s>strikethrough</s>, <code>monospace</code>',
  { chatId: '@channel', parseMode: 'HTML' }
);
```

### Markdown Formatting

```javascript
await hub.sendMessage('telegram', 
  '*Bold*, _italic_, `monospace`, [link](https://example.com)',
  { chatId: '@channel', parseMode: 'MarkdownV2' }
);
```

## Error Handling

The implementation includes comprehensive error handling:

```javascript
try {
  await hub.sendMessage('telegram', 'Hello!', { chatId: '@channel' });
} catch (error) {
  if (error.message.includes('chat not found')) {
    console.log('Bot is not added to the channel');
  } else if (error.message.includes('insufficient rights')) {
    console.log('Bot lacks permission to send messages');
  } else {
    console.log('Other error:', error.message);
  }
}
```

## Configuration Options

The Telegram configuration (`config/telegram.js`) includes:

```javascript
{
  token: 'bot_token',              // Required: Bot token from BotFather
  defaultChatId: '@channel',       // Optional: Default chat for testing
  webhook: {                       // Optional: Webhook configuration
    url: 'https://yourdomain.com/webhook',
    port: 8443,
    host: 'localhost'
  },
  api: {                          // API settings
    timeout: 30000,               // Request timeout
    retryLimit: 3                 // Retry failed requests
  },
  limits: {                       // Telegram API limits
    messageLength: 4096,          // Max message length
    captionLength: 1024,          // Max caption length
    mediaGroupSize: 10,           // Max media group size
    fileSize: 50 * 1024 * 1024   // Max file size (50MB)
  }
}
```

## Testing

Run the test suite:

```bash
node test_telegram.js
```

Run usage examples:

```bash
node telegram_examples.js
```

## Best Practices

1. **Rate Limiting**: Telegram has rate limits (30 messages/second to different chats)
2. **File Sizes**: Keep files under 50MB for documents, 10MB for photos
3. **Message Length**: Keep messages under 4096 characters
4. **Bot Permissions**: Ensure your bot has appropriate permissions in channels/groups
5. **Error Handling**: Always wrap API calls in try-catch blocks
6. **Chat IDs**: Store chat IDs securely and validate them before use

## Troubleshooting

### Common Issues

1. **"Bot was blocked by the user"**
   - User has blocked your bot
   - Solution: User needs to unblock the bot

2. **"Chat not found"**
   - Bot is not added to the channel/group
   - Solution: Add bot to the chat and give appropriate permissions

3. **"Not enough rights to send messages"**
   - Bot lacks permissions
   - Solution: Give bot admin rights or message sending permissions

4. **"Message is too long"**
   - Message exceeds 4096 characters
   - Solution: Split message or use content adaptation

### Debug Mode

Enable debug logging by setting environment:

```bash
NODE_ENV=development node your_script.js
```

This implementation provides a robust, production-ready Telegram integration with comprehensive error handling, logging, and feature support.