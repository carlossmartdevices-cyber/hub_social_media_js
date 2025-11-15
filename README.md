# Social Media Content Hub v2.0

A scalable, enterprise-grade multi-platform social media content management and scheduling system built with Node.js, TypeScript, and React.

## Features

### Core Capabilities
- **Multi-Platform Support**: Post to Twitter, Telegram, Instagram, TikTok, Facebook, LinkedIn, and YouTube
- **Advanced Scheduling**: Schedule posts with timezone support, recurring schedules, and bulk operations
- **Content Adaptation**: Automatically adapts content to platform-specific requirements (character limits, media formats)
- **Media Processing**: Automatic image optimization, resizing, and compression
- **Real-Time Analytics**: Track engagement metrics (likes, shares, comments, views)
- **Job Queue System**: Distributed job processing with BullMQ and Redis
- **RESTful API**: Complete API for external integrations
- **User Dashboard**: Modern React-based web interface

### Technical Highlights
- **Layered Architecture**: Clean separation of concerns with presentation, application, domain, and infrastructure layers
- **Security**: JWT authentication, encrypted credentials, input validation, rate limiting
- **Scalability**: Horizontal scaling ready with Docker and Kubernetes support
- **Testing**: Comprehensive unit, integration, and E2E tests
- **CI/CD**: Automated testing and deployment with GitHub Actions
- **Database**: PostgreSQL with optimized schema and migrations
- **Caching**: Redis for job queues and performance optimization

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  React SPA   │  │   REST API   │  │   GraphQL    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Hub Manager │  │ Job Scheduler│  │  Analytics   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                       Domain Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Content Adapter│ │MediaProcessor│  │  Validators  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │Platform APIs │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
content-hub/
├── src/
│   ├── core/                    # Core business logic
│   │   ├── hub/                 # Hub manager
│   │   ├── content/             # Content adaptation & media processing
│   │   └── analytics/           # Analytics
│   ├── platforms/               # Platform-specific adapters
│   │   ├── base/                # Base adapter interface
│   │   ├── twitter/
│   │   ├── telegram/
│   │   ├── instagram/
│   │   ├── facebook/
│   │   ├── linkedin/
│   │   ├── youtube/
│   │   └── tiktok/
│   ├── database/                # Database layer
│   │   ├── models/
│   │   ├── repositories/
│   │   └── migrations/
│   ├── api/                     # REST API
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── middlewares/
│   ├── jobs/                    # Job queue & workers
│   │   ├── queue.ts
│   │   └── workers/
│   ├── utils/                   # Utilities
│   └── config/                  # Configuration
├── client/                      # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── store/
│       └── styles/
├── tests/                       # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker/                      # Docker configs
├── .github/workflows/           # CI/CD
└── docs/                        # Documentation
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hub_social_media_js
```

2. Install dependencies:
```bash
npm install
cd client && npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start services with Docker:
```bash
docker-compose up -d
```

Or manually:
```bash
# Start PostgreSQL and Redis
# Run migrations
npm run db:migrate

# Start backend
npm run dev

# In another terminal, start frontend
cd client && npm run dev
```

5. Access the application:
- Frontend: http://localhost:3001
- API: http://localhost:3000/api
- Health Check: http://localhost:3000/health

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key configurations:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT token signing
- `ENCRYPTION_KEY`: Key for encrypting platform credentials

### Platform Credentials

Add platform credentials through the Settings page or API:

```bash
POST /api/platforms/credentials
{
  "platform": "twitter",
  "credentials": {
    "apiKey": "...",
    "apiSecret": "...",
    "accessToken": "...",
    "accessSecret": "..."
  }
}
```

## API Documentation

### Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Endpoints

#### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get user profile

#### Posts
- `POST /api/posts` - Create and schedule post
- `GET /api/posts` - List posts
- `GET /api/posts/:id` - Get post details
- `DELETE /api/posts/:id/cancel` - Cancel scheduled post
- `GET /api/posts/:id/metrics` - Get post metrics

#### Platforms
- `GET /api/platforms/supported` - List supported platforms
- `GET /api/platforms/credentials` - List user credentials
- `POST /api/platforms/credentials` - Add platform credentials
- `DELETE /api/platforms/credentials/:platform` - Remove credentials

### Example: Create Post

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["twitter", "telegram"],
    "content": {
      "text": "Hello from Content Hub!",
      "hashtags": ["automation", "socialmedia"]
    },
    "scheduledAt": "2025-12-01T12:00:00Z"
  }'
```

## Development

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Building

```bash
# Build backend
npm run build

# Build frontend
cd client && npm run build
```

## Deployment

### Docker

```bash
# Build image
docker build -t content-hub:latest .

# Run with Docker Compose
docker-compose up -d
```

### Kubernetes

```bash
# Apply configurations
kubectl apply -f k8s/
```

### Manual

```bash
# Build
npm run build
cd client && npm run build

# Start
NODE_ENV=production npm start
```

## Platform-Specific Setup

### Twitter/X
1. Create app at https://developer.twitter.com
2. Get API keys and access tokens
3. Add credentials in Settings

### Telegram
1. Create bot via @BotFather
2. Get bot token
3. Get chat ID
4. Add credentials in Settings

### Instagram
1. Set up Facebook Developer account
2. Create app with Instagram Basic Display
3. Get access token
4. Add credentials in Settings

### Other Platforms
See individual platform documentation in `docs/platforms/`

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Testing Strategy

- **Unit Tests**: Core logic, adapters, utilities
- **Integration Tests**: API endpoints, database operations
- **E2E Tests**: Complete user workflows
- **Coverage Target**: 70%+

## Security

- API keys encrypted at rest using AES-256
- JWT tokens for authentication
- Rate limiting on all endpoints
- Input validation and sanitization
- HTTPS enforced in production
- Regular dependency updates

## Performance

- Horizontal scaling with multiple workers
- Redis caching for frequently accessed data
- Database query optimization with indexes
- Media processing in background jobs
- Connection pooling for database

## Monitoring

- Winston logging to files and console
- Health check endpoint
- Job metrics tracking
- Platform API rate limit monitoring
- Error tracking with Sentry (optional)

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres
```

### Redis Connection Issues
```bash
# Check Redis is running
docker-compose ps redis

# Test connection
redis-cli ping
```

### Worker Issues
```bash
# Check worker logs
docker-compose logs app

# Restart workers
docker-compose restart app
```

## Roadmap

- [ ] GraphQL API
- [ ] Webhook support
- [ ] Advanced analytics dashboard
- [ ] Content calendar view
- [ ] Team collaboration features
- [ ] Mobile app
- [ ] AI-powered content suggestions
- [ ] A/B testing for posts

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/...)
- Documentation: See `docs/` folder
- Email: support@example.com

## Acknowledgments

Built with:
- Node.js & TypeScript
- Express.js
- PostgreSQL
- Redis & BullMQ
- React
- Docker
- And many other amazing open-source projects
