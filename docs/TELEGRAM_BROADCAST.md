# Telegram Broadcast System

## Overview

The Telegram Broadcast System allows you to upload videos to Telegram and broadcast them to multiple channels and groups simultaneously. Videos are hosted on Telegram's servers, supporting files up to 2GB for long-duration content. The system includes AI-powered description generation using Grok to create engaging bilingual captions.

## Why Use Telegram for Video Hosting?

- **Large File Support**: Upload videos up to 2GB (much larger than most social platforms)
- **Long-Duration Videos**: No time limits on video length
- **Free Hosting**: Telegram provides free cloud storage for all media
- **High Quality**: Videos are delivered in high quality to viewers
- **Fast Distribution**: Telegram's CDN ensures fast delivery worldwide
- **File ID Reuse**: Upload once, broadcast to multiple channels efficiently

## Prerequisites

### 1. Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Copy the **Bot Token** (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. **Important**: Keep this token secret!

### 2. Add Bot to Your Channels/Groups

For each channel or group you want to broadcast to:

1. Open your channel/group in Telegram
2. Go to channel/group settings
3. Click "Administrators"
4. Click "Add Administrator"
5. Search for your bot (by username)
6. Grant the bot permission to:
   - Post messages
   - Edit messages (optional)
   - Delete messages (optional)

### 3. Configure Environment Variables

Add to your `.env` file:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Grok AI (for description generation)
XAI_API_KEY=your_grok_api_key_here
XAI_ENABLED=true
XAI_BASE_URL=https://api.x.ai/v1
XAI_MODEL=grok-beta
```

### 4. Get Channel/Group Chat ID

**For Public Channels**:
- Use the channel username with @ (e.g., `@mychannel`)

**For Private Channels/Groups**:
1. Add your bot to the channel/group as admin
2. Forward any message from the channel to `@userinfobot`
3. The bot will reply with the chat ID (e.g., `-1001234567890`)
4. Use this numeric ID in the system

**Alternative Method**:
1. Make a test post in your channel
2. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Look for `"chat":{"id":-1001234567890}` in the JSON response

## How to Use

### 1. Navigate to Telegram Broadcast

Click on "Telegram" in the main navigation menu.

### 2. Manage Channels (One-Time Setup)

Click the "Manage Channels" tab:

1. **Add a Channel**:
   - Enter the chat ID (e.g., `@mychannel` or `-1001234567890`)
   - Click "Check Channel" to verify bot access
   - If successful, click "Add Channel"

2. **View Channels**:
   - See all configured channels with their status
   - Check last broadcast time

3. **Remove Channels**:
   - Click "Remove" next to any channel you no longer need

### 3. Broadcast a Video

Click the "Broadcast Video" tab:

#### Step 1: Select and Upload Video
1. Click "Select Video" to choose a video file
2. Supported formats: MP4, MOV, AVI, MKV
3. Maximum size: 2GB
4. Video preview will appear
5. Click "Upload to Telegram"
6. Wait for upload to complete (progress bar shows status)

#### Step 2: Generate AI Description
1. Enter video metadata:
   - **Title**: Main title for your video
   - **Description**: What the video is about
   - **Goal**: What you want to achieve (e.g., "Increase engagement", "Promote product")
2. Select language: English or Spanish (or both)
3. Click "Generate AI Description"
4. Review the generated caption
5. Edit the caption if needed

#### Step 3: Select Channels and Broadcast
1. Check the boxes for channels you want to broadcast to
2. Click "Broadcast to Selected Channels"
3. View broadcast results showing success/failure for each channel

## AI-Generated Descriptions

The system uses Grok AI to create engaging captions optimized for:

- **SEO**: Includes relevant keywords and hashtags
- **Engagement**: Uses power words and emotional triggers
- **Click-through**: Creates curiosity and value proposition
- **Bilingual Support**: Can generate in English and Spanish
- **Platform Optimization**: Formatted for Telegram's features

### Description Generation Options

**Language Selection**:
- **English**: Generate description in English with English hashtags
- **Spanish**: Generate description in Spanish with Spanish hashtags
- **Both**: Generate bilingual content (English and Spanish variants)

**User Goal Examples**:
- "Increase engagement and comments"
- "Promote my new product launch"
- "Drive traffic to my website"
- "Build community and loyalty"
- "Educate my audience about [topic]"

## Broadcast Features

### Efficient Multi-Channel Broadcasting
- Upload video once to Telegram servers
- Get a `file_id` for the uploaded video
- Reuse the `file_id` for all broadcasts (no re-uploading)
- Rate limiting (1 second delay between channels to avoid restrictions)

### Broadcast Results Tracking
After broadcasting, you'll see:
- ✅ Success: Channel name and message ID
- ❌ Failed: Channel name and error message
- Timestamp of each broadcast
- Total success/failure count

### Supported Channel Types
- **Channels**: Public and private Telegram channels
- **Groups**: Regular Telegram groups
- **Supergroups**: Large Telegram supergroups

## API Endpoints

### POST `/api/telegram/upload-video`
Upload a video to Telegram servers

**Request**: `multipart/form-data`
- `video`: Video file (max 2GB)
- `duration`: Video duration in seconds (optional)
- `width`: Video width in pixels (optional)
- `height`: Video height in pixels (optional)
- `supportsStreaming`: Enable streaming (default: true)

**Response**:
```json
{
  "success": true,
  "result": {
    "fileId": "BAACAgIAAxkBAAI...",
    "fileSize": 15728640,
    "duration": 120,
    "width": 1920,
    "height": 1080
  }
}
```

### POST `/api/telegram/generate-description`
Generate AI-powered video description

**Request Body**:
```json
{
  "title": "My Amazing Video",
  "description": "This video shows how to...",
  "userGoal": "Increase engagement",
  "language": "en"
}
```

**Response**:
```json
{
  "success": true,
  "caption": "🎥 My Amazing Video\n\nThis video shows...\n\n#hashtag1 #hashtag2"
}
```

### POST `/api/telegram/broadcast-video`
Broadcast video to multiple channels

**Request Body**:
```json
{
  "fileId": "BAACAgIAAxkBAAI...",
  "caption": "Video description with hashtags",
  "channelIds": ["uuid1", "uuid2"],
  "parseMode": "HTML",
  "disableNotification": false
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "channelId": "uuid1",
      "channelTitle": "My Channel",
      "success": true,
      "messageId": 12345,
      "timestamp": "2025-11-19T10:30:00Z"
    }
  ]
}
```

### POST `/api/telegram/broadcast-text`
Broadcast text message to channels

**Request Body**:
```json
{
  "text": "Important announcement!",
  "channelIds": ["uuid1", "uuid2"],
  "parseMode": "HTML"
}
```

### GET `/api/telegram/channels`
List all configured channels

**Response**:
```json
{
  "success": true,
  "channels": [
    {
      "id": "uuid",
      "chatId": "@mychannel",
      "title": "My Channel",
      "type": "channel",
      "isActive": true,
      "lastBroadcastAt": "2025-11-19T10:30:00Z"
    }
  ]
}
```

### POST `/api/telegram/channels`
Add a new channel

**Request Body**:
```json
{
  "chatId": "@mychannel",
  "title": "My Channel",
  "type": "channel",
  "username": "mychannel"
}
```

### DELETE `/api/telegram/channels/:id`
Remove a channel

**Response**:
```json
{
  "success": true,
  "message": "Channel removed successfully"
}
```

### POST `/api/telegram/check-channel`
Verify bot has admin access to a channel

**Request Body**:
```json
{
  "chatId": "@mychannel"
}
```

**Response**:
```json
{
  "success": true,
  "channel": {
    "chatId": "@mychannel",
    "title": "My Channel",
    "type": "channel",
    "hasAccess": true
  }
}
```

## Database Schema

### telegram_channels
Stores configured channels and groups

```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to users)
- chat_id: VARCHAR(255) - Telegram chat ID
- title: VARCHAR(255) - Channel/group name
- type: VARCHAR(50) - 'channel', 'group', or 'supergroup'
- username: VARCHAR(255) - @username if public
- is_active: BOOLEAN
- last_broadcast_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### telegram_broadcasts
Tracks broadcast history

```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to users)
- file_id: VARCHAR(500) - Telegram file ID
- caption: TEXT - Broadcast caption
- broadcast_type: VARCHAR(50) - 'video' or 'text'
- total_channels: INTEGER
- successful_channels: INTEGER
- failed_channels: INTEGER
- created_at: TIMESTAMP
```

### telegram_broadcast_results
Individual results per channel

```sql
- id: UUID (primary key)
- broadcast_id: UUID (foreign key to telegram_broadcasts)
- channel_id: UUID (foreign key to telegram_channels)
- success: BOOLEAN
- message_id: VARCHAR(255) - Telegram message ID if successful
- error_message: TEXT - Error details if failed
- created_at: TIMESTAMP
```

## Best Practices

### Video Optimization
1. **Compress Videos**: Use H.264 codec for best compatibility
2. **Resolution**: 1080p or 720p recommended
3. **Format**: MP4 is most widely supported
4. **Audio**: Include audio track, AAC codec recommended
5. **Thumbnails**: Telegram auto-generates, but you can specify custom

### Caption Guidelines
1. **Length**: Keep under 1024 characters (Telegram limit)
2. **Formatting**: Use HTML or Markdown formatting
3. **Hashtags**: Include 3-5 relevant hashtags
4. **Emojis**: Use sparingly for emphasis
5. **Call-to-Action**: Include clear next steps for viewers
6. **Links**: Add relevant links (Telegram supports clickable links)

### Broadcasting Strategy
1. **Test First**: Try broadcasting to one channel before multiple
2. **Timing**: Consider your audience's time zones
3. **Frequency**: Don't spam - space out broadcasts
4. **Monitoring**: Check results after each broadcast
5. **Engagement**: Respond to comments on your broadcasts

### Security
1. **Bot Token**: Never share your bot token publicly
2. **Admin Rights**: Only grant necessary permissions
3. **Channel IDs**: Keep private channel IDs confidential
4. **Regular Audits**: Review which channels have access

## Telegram Limits and Rate Limiting

### Telegram API Limits
- **Messages per second**: ~30 messages/second per bot
- **Group/Channel limit**: 20 messages/minute to same group
- **File size**: 2GB maximum
- **Caption length**: 1024 characters

### Our Rate Limiting
- 1 second delay between channel broadcasts (built-in)
- Automatic retry on rate limit errors
- Queue system for large broadcasts

## Troubleshooting

### "Bot is not an administrator"
**Problem**: Bot doesn't have admin rights in the channel
**Solution**:
1. Open channel settings
2. Add bot as administrator
3. Grant "Post messages" permission
4. Try again

### "Chat not found"
**Problem**: Invalid chat ID or bot not in the channel
**Solution**:
1. Verify chat ID is correct
2. Ensure bot is added to the channel
3. For private channels, use numeric ID (e.g., `-1001234567890`)

### "File too large"
**Problem**: Video exceeds 2GB limit
**Solution**:
1. Compress the video
2. Split into multiple parts
3. Use lower resolution/bitrate

### Upload Fails
**Problem**: Network issues or file corruption
**Solution**:
1. Check your internet connection
2. Verify file is not corrupted
3. Try a different video file
4. Check server logs for detailed error

### No Response from AI
**Problem**: Grok AI service unavailable
**Solution**:
1. Verify `XAI_API_KEY` is set
2. Check `XAI_ENABLED=true`
3. Test API connectivity
4. Manually write description if AI is down

### "Message is too long"
**Problem**: Caption exceeds 1024 characters
**Solution**:
1. Edit the caption to be shorter
2. Remove unnecessary text
3. Use Telegram's file caption + first comment pattern

## Advanced Features

### HTML Formatting in Captions

```html
<b>Bold text</b>
<i>Italic text</i>
<u>Underlined text</u>
<s>Strikethrough</s>
<a href="https://example.com">Link</a>
<code>Monospace code</code>
<pre>Preformatted block</pre>
```

### Scheduled Broadcasting
(Coming soon)
- Schedule broadcasts for specific times
- Recurring broadcasts
- Time zone support

### Analytics
(Coming soon)
- View count tracking
- Engagement metrics
- Channel performance comparison

### Bulk Operations
(Coming soon)
- Bulk channel import
- Batch video uploads
- Template descriptions

## Integration with Video Workflow

The Telegram Broadcast system integrates with the existing video workflow:

1. **Upload Video** → Generate AI metadata
2. **Create Post** → Generate post variants
3. **Broadcast to Telegram** → Use same AI service
4. **Cross-Platform** → Share to Twitter, Telegram, and other platforms

## Migration from Other Platforms

### From YouTube
1. Download your video from YouTube
2. Upload to Telegram via this system
3. Migrate subscribers to Telegram channel
4. Cross-post announcements

### From Social Media
1. Export videos from Instagram/TikTok/Twitter
2. Upload to Telegram for permanent hosting
3. Share Telegram links on other platforms
4. Build Telegram community

## Support and Resources

- **Telegram Bot API Docs**: https://core.telegram.org/bots/api
- **@BotFather**: Create and manage bots
- **@userinfobot**: Get chat IDs
- **Telegram Support**: @BotSupport

## Future Enhancements

Planned features:
- Scheduled broadcasts with timezone support
- Video analytics and view tracking
- A/B testing for captions
- Template library for descriptions
- Webhook integration for real-time updates
- Bulk import from other platforms
- Advanced filtering and targeting

---

**Last Updated**: 2025-11-19
**Version**: 1.0.0
