# Social Media Hub - Node.js

A centralized hub for managing live streams, messaging, and content distribution across Twitter, Telegram, Instagram, and TikTok.

## Features

- **Multi-Platform Support**: Send messages to Twitter, Telegram, Instagram, and TikTok
- **Scheduled Content**: Schedule messages for future delivery with node-schedule
- **Content Adaptation**: Automatically adapts content to platform-specific character limits
- **Job Management**: Track, cancel, and monitor scheduled jobs
- **Database Persistence**: PostgreSQL database for storing scheduled content
- **Error Handling**: Comprehensive error handling with custom error classes
- **Input Validation**: Validates all inputs before processing
- **Connection Pooling**: Optimized database connection pooling
- **Graceful Shutdown**: Handles SIGINT and SIGTERM for clean shutdowns
- **Environment Configuration**: Secure configuration via environment variables

## Requirements

- Node.js 14.0.0 or higher
- PostgreSQL 12 or higher
- API credentials for each platform you want to use

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hub_social_media_js
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your credentials:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=hub_social_media
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password

   # Twitter API Configuration (Get from https://developer.twitter.com)
   TWITTER_CONSUMER_KEY=your_consumer_key
   TWITTER_CONSUMER_SECRET=your_consumer_secret
   TWITTER_ACCESS_TOKEN=your_access_token
   TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret

   # Telegram API Configuration (Get from @BotFather)
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token

   # Instagram Configuration
   INSTAGRAM_USERNAME=your_username
   INSTAGRAM_PASSWORD=your_password

   # TikTok Configuration
   TIKTOK_ACCESS_TOKEN=your_access_token

   # Application Configuration
   NODE_ENV=development
   PORT=3000
   ```

4. **Set up PostgreSQL database**
   ```bash
   createdb hub_social_media
   ```

5. **Run the application**
   ```bash
   npm start
   ```

## Project Structure

```
hub_social_media_js/
├── config/                    # Configuration files
│   ├── database.js           # Database configuration
│   ├── twitter.js            # Twitter API configuration
│   ├── telegram.js           # Telegram API configuration
│   ├── instagram.js          # Instagram API configuration
│   └── tiktok.js             # TikTok API configuration
├── src/
│   ├── core/                 # Core business logic
│   │   ├── hubManager.js     # Main hub manager
│   │   ├── contentScheduler.js # Content scheduling
│   │   └── contentAdapter.js # Platform content adaptation
│   ├── platforms/            # Platform-specific implementations
│   │   ├── twitter/
│   │   │   └── apiClient.js  # Twitter API client
│   │   ├── telegram/
│   │   │   └── apiClient.js  # Telegram API client
│   │   ├── instagram/
│   │   │   └── apiClient.js  # Instagram API client
│   │   └── tiktok/
│   │       └── apiClient.js  # TikTok API client
│   ├── database/             # Database layer
│   │   ├── dbConnection.js   # Database connection
│   │   ├── models.js         # Sequelize models
│   │   └── repository.js     # Data access layer
│   ├── utils/                # Utilities
│   │   ├── logger.js         # Logging utility
│   │   ├── errorHandler.js   # Error handling
│   │   ├── validator.js      # Input validation
│   │   └── contentFormatter.js
│   └── main.js               # Application entry point
├── .env                      # Environment variables (not in repo)
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore file
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

## Usage

### Basic Example

```javascript
const HubManager = require('./core/hubManager');
const ContentScheduler = require('./core/contentScheduler');

const hub = new HubManager();
const scheduler = new ContentScheduler(hub);

// Send immediate message
await hub.sendMessage('twitter', 'Hello from Social Media Hub!');

// Schedule future message
const scheduledTime = new Date(Date.now() + 3600000); // 1 hour from now
await scheduler.scheduleContent(
  'twitter',
  'This is a scheduled tweet',
  scheduledTime,
  {}
);
```

### Platform Character Limits

The ContentAdapter automatically handles platform-specific limits:

- **Twitter**: 280 characters
- **Telegram**: 4096 characters
- **Instagram**: 2200 characters
- **TikTok**: 150 characters

### Error Handling

The application uses custom error classes:

- `ValidationError`: Input validation failures
- `DatabaseError`: Database operation failures
- `PlatformAPIError`: Platform API failures

### Job Management

```javascript
// Schedule content
const content = await scheduler.scheduleContent(
  'twitter',
  'My message',
  new Date('2025-01-01T12:00:00'),
  {}
);

// Cancel scheduled content
await scheduler.cancelScheduledContent(content.id);

// Get all scheduled content
const scheduled = await scheduler.getScheduledContents();
```

## API Documentation

### HubManager

#### `sendMessage(platform, message, options)`
Sends a message to the specified platform.

- **platform**: 'twitter' | 'telegram' | 'instagram' | 'tiktok'
- **message**: String - The message content
- **options**: Object - Platform-specific options

### ContentScheduler

#### `scheduleContent(platform, message, scheduledTime, options)`
Schedules content for future delivery.

- **platform**: Platform name
- **message**: Message content
- **scheduledTime**: Date object
- **options**: Additional options

#### `cancelScheduledContent(contentId)`
Cancels a scheduled message.

#### `getScheduledContents()`
Retrieves all scheduled content from the database.

## Development

```bash
# Run in development mode
npm run dev

# Run tests (when implemented)
npm test
```

## Security Best Practices

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use strong database passwords**
3. **Rotate API keys regularly**
4. **Run with least privilege** - Don't run as root
5. **Keep dependencies updated** - Run `npm audit` regularly

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists

### Platform API Errors
- Verify API credentials are correct
- Check API rate limits
- Ensure proper API permissions

### Scheduling Issues
- Check system time is correct
- Verify scheduled times are in the future
- Check database for scheduled jobs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## TODO / Future Improvements

- [ ] Implement Telegram bot functionality
- [ ] Add Instagram API implementation
- [ ] Add TikTok API implementation
- [ ] Implement retry logic with exponential backoff
- [ ] Add rate limiting per platform
- [ ] Create REST API for external integrations
- [ ] Add metrics and monitoring
- [ ] Implement comprehensive test suite
- [ ] Add support for media uploads on all platforms
- [ ] Create web dashboard for management
- [ ] Add webhook support for platform events