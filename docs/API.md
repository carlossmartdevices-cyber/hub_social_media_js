# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### Register
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "jwt-token"
}
```

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "jwt-token"
}
```

### Posts

#### Create Post
```http
POST /api/posts
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "platforms": ["twitter", "telegram", "instagram"],
  "content": {
    "text": "Your post content here",
    "hashtags": ["automation", "socialmedia"],
    "mentions": ["@username"],
    "link": "https://example.com"
  },
  "scheduledAt": "2025-12-01T12:00:00Z",
  "recurrence": {
    "type": "daily",
    "interval": 1,
    "timeOfDay": "09:00",
    "endDate": "2025-12-31T23:59:59Z"
  }
}
```

**Response:** `201 Created`
```json
{
  "message": "Post scheduled successfully",
  "postId": "uuid"
}
```

#### List Posts
```http
GET /api/posts?status=scheduled&platform=twitter&limit=50&offset=0
```

**Query Parameters:**
- `status` (optional): Filter by status (draft, scheduled, published, failed, cancelled)
- `platform` (optional): Filter by platform
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `200 OK`
```json
{
  "posts": [...],
  "total": 100
}
```

#### Get Post
```http
GET /api/posts/:id
```

**Response:** `200 OK`
```json
{
  "post": {
    "id": "uuid",
    "platforms": ["twitter", "telegram"],
    "content": {...},
    "status": "published",
    "scheduledAt": "...",
    "publishedAt": "...",
    "platform_results": [...]
  }
}
```

#### Cancel Post
```http
DELETE /api/posts/:id/cancel
```

**Response:** `200 OK`
```json
{
  "message": "Post cancelled successfully"
}
```

#### Get Post Metrics
```http
GET /api/posts/:id/metrics
```

**Response:** `200 OK`
```json
{
  "metrics": [
    {
      "platform": "twitter",
      "likes": 150,
      "shares": 25,
      "comments": 10,
      "views": 1000,
      "engagement": 185,
      "timestamp": "..."
    }
  ]
}
```

### Platforms

#### Get Supported Platforms
```http
GET /api/platforms/supported
```

**Response:** `200 OK`
```json
{
  "platforms": [
    "twitter",
    "telegram",
    "instagram",
    "tiktok",
    "facebook",
    "linkedin",
    "youtube"
  ]
}
```

#### List Credentials
```http
GET /api/platforms/credentials
```

**Response:** `200 OK`
```json
{
  "credentials": [
    {
      "platform": "twitter",
      "is_active": true,
      "last_validated": "...",
      "created_at": "..."
    }
  ]
}
```

#### Add Credentials
```http
POST /api/platforms/credentials
```

**Request Body (Twitter):**
```json
{
  "platform": "twitter",
  "credentials": {
    "apiKey": "your-api-key",
    "apiSecret": "your-api-secret",
    "accessToken": "your-access-token",
    "accessSecret": "your-access-secret"
  }
}
```

**Request Body (Telegram):**
```json
{
  "platform": "telegram",
  "credentials": {
    "botToken": "your-bot-token",
    "chatId": "your-chat-id"
  }
}
```

**Response:** `201 Created`
```json
{
  "message": "Credentials added successfully",
  "platform": "twitter"
}
```

#### Remove Credentials
```http
DELETE /api/platforms/credentials/:platform
```

**Response:** `200 OK`
```json
{
  "message": "Credentials removed successfully"
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

### Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Rate Limiting

- **Default**: 100 requests per 15 minutes
- **Headers**:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## Pagination

List endpoints support pagination:
- `limit`: Number of items per page (default: 50, max: 100)
- `offset`: Number of items to skip (default: 0)

## Webhooks (Coming Soon)

Subscribe to events:
- `post.published`
- `post.failed`
- `metrics.updated`
