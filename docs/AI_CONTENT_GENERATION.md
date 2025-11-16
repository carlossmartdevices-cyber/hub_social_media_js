# AI Content Generation with Grok

This document describes the AI-powered content generation feature integrated into the Social Media Content Hub using xAI's Grok API.

## Overview

The AI Content Generation feature uses **xAI's Grok** (via the OpenAI SDK) to automatically generate engaging, bilingual social media posts for PNPtv's X (Twitter) and Telegram platforms. The content is optimized to avoid spam detection while maintaining a bold, playful, Latino party brand voice.

## Features

- **Bilingual Content**: Generates posts in both English and Spanish
- **Anti-Spam Optimized**: Unique variations in wording, emoji usage, hashtag order, and link placement
- **Brand-Aligned**: Follows PNPtv's sexy, bold, hazy party brand voice
- **Flexible Options**: Generate single posts or batches of up to 24 posts per language
- **Platform-Specific**: Can target specific platforms (X, Telegram, etc.)
- **Customizable**: Supports custom instructions for specific content needs

## Setup

### 1. Install Dependencies

The OpenAI SDK is already installed as part of the project dependencies.

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# xAI Grok API Configuration
XAI_API_KEY=your_xai_api_key_here
XAI_BASE_URL=https://api.x.ai/v1
XAI_MODEL=grok-beta
XAI_TEMPERATURE=0.7
XAI_MAX_TOKENS=4000
XAI_ENABLED=true
```

### 3. Get Your Grok API Key

1. Visit [x.ai](https://x.ai) and sign up for an account
2. You'll need an **X Premium+ subscription** ($40/month) for API access
3. Generate your API key from the xAI Developer Console
4. Copy the key to your `.env` file as `XAI_API_KEY`

**Pricing**:
- $2 per million input tokens
- $10 per million output tokens
- $25/month in free API credits during public beta

## API Endpoints

### 1. Generate Multiple Posts (Bilingual)

Generate a batch of unique posts in both English and Spanish.

**Endpoint**: `POST /api/posts/ai/generate`

**Authentication**: Required (JWT Bearer token)

**Request Body**:
```json
{
  "optionsCount": 12,
  "language": "en",
  "platform": "twitter",
  "customInstructions": "Focus on party events in Miami"
}
```

**Parameters**:
- `optionsCount` (optional, default: 12): Number of posts per language (1-24)
- `language` (optional): `"en"` or `"es"` - if omitted, generates both
- `platform` (optional): Target platform (`"twitter"`, `"telegram"`, etc.)
- `customInstructions` (optional): Additional context or requirements

**Response**:
```json
{
  "message": "AI content generated successfully",
  "content": {
    "english": [
      {
        "text": "Latino boys getting cloudy under neon lights...",
        "hashtags": ["#PNP", "#LatinoPNP", "#PNPMiami"],
        "links": ["https://t.me/pnptvbot", "PNPtv.app"]
      }
    ],
    "spanish": [
      {
        "text": "Chicos latinos disfrutando la noche...",
        "hashtags": ["#PNP", "#LatinosPNP", "#FiestaCloud"],
        "links": ["PNPtv.app", "https://t.me/pnptvbot"]
      }
    ],
    "metadata": {
      "generatedAt": "2025-11-16T10:30:00.000Z",
      "model": "grok-beta",
      "totalOptions": 24
    }
  }
}
```

### 2. Generate Single Post

Generate a single post for a specific platform and language.

**Endpoint**: `POST /api/posts/ai/generate-single`

**Authentication**: Required (JWT Bearer token)

**Request Body**:
```json
{
  "platform": "twitter",
  "language": "en"
}
```

**Parameters**:
- `platform` (required): Target platform
- `language` (optional, default: "en"): `"en"` or `"es"`

**Response**:
```json
{
  "message": "AI post generated successfully",
  "content": "Latino boys getting cloudy under neon lights...\n\nhttps://t.me/pnptvbot\nPNPtv.app\n\n#PNP #LatinoPNP #PNPMiami",
  "platform": "twitter",
  "language": "en"
}
```

## Usage Examples

### Using cURL

```bash
# Generate 12 posts in both languages
curl -X POST http://localhost:3000/api/posts/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "optionsCount": 12,
    "customInstructions": "Focus on Berlin nightlife"
  }'

# Generate a single Spanish post for Telegram
curl -X POST http://localhost:3000/api/posts/ai/generate-single \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "platform": "telegram",
    "language": "es"
  }'
```

### Using JavaScript/Node.js

```javascript
const axios = require('axios');

const generatePosts = async () => {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/posts/ai/generate',
      {
        optionsCount: 12,
        platform: 'twitter',
        customInstructions: 'Focus on Tokyo party scene'
      },
      {
        headers: {
          'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Generated posts:', response.data.content);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

generatePosts();
```

### Using Python

```python
import requests

url = "http://localhost:3000/api/posts/ai/generate"
headers = {
    "Authorization": f"Bearer {YOUR_JWT_TOKEN}",
    "Content-Type": "application/json"
}
data = {
    "optionsCount": 12,
    "platform": "twitter"
}

response = requests.post(url, json=data, headers=headers)
posts = response.json()

print(f"Generated {len(posts['content']['english'])} English posts")
print(f"Generated {len(posts['content']['spanish'])} Spanish posts")
```

## Brand Voice Guidelines

The AI is configured with a comprehensive master prompt that ensures all generated content:

### Brand Identity
- **Tone**: Bold, horny, Latino, hazy, and playful
- **Target Audience**: Latino men interested in PNP scenes
- **Content Themes**: Smoking, clouding, slamming, party haze, fetish energy
- **Style**: Natural, chatty, sexy - not corporate or pushy

### Anti-Spam Features
1. **Unique Content**: Every post is completely different in wording, structure, and length
2. **Varied Hashtags**: Random selection of 3-7 hashtags per post with changing order
3. **Randomized Links**: Required links appear in different orders and positions
4. **Diverse Sentence Structures**: Mix of short, long, teasing, and descriptive posts
5. **Rotating Emojis**: Different emoji combinations in every post
6. **No Repetition**: Avoids identical punchlines, intros, or closings

### SEO Hashtags

**English/General**:
- #PNP, #PNPgay, #CloudParty, #Slamming, #LatinoPNP, #ChemLatino, #GayLatino

**Spanish/General**:
- #PNP, #GayPNP, #LatinosPNP, #FiestaCloud, #SlamLatino

**Location-Based** (rotated across posts):
- **USA**: #PNPMiami, #PNPLA, #PNPNYC, #PNPHouston, #PNPDallas, #PNPAtlanta
- **Europe**: #PNPBerlin, #PNPMadrid, #PNPBarcelona, #PNPLondon, #PNPAmsterdam, #PNPParis, #PNPPrague
- **Asia**: #PNPTokyo, #PNPBangkok, #PNPTaipei, #PNPManila, #PNPSeoul

### Required Links

Every post includes both links (order varies):
- https://t.me/pnptvbot
- PNPtv.app

## Architecture

### AIContentService

Located at: `src/services/AIContentService.ts`

**Key Methods**:

1. `isAvailable()`: Check if Grok API is configured and available
2. `generatePosts(request)`: Generate batch of bilingual posts
3. `generateSinglePost(platform, language)`: Generate one post for specific platform/language

**Internal Methods**:
- `parseGeneratedContent()`: Parse Grok's response into structured format
- `extractPostDetails()`: Extract text, hashtags, and links from individual posts
- `createFallbackPosts()`: Provide fallback if parsing fails

### Configuration

Located at: `src/config/index.ts`

```typescript
ai: {
  grok: {
    apiKey: process.env.XAI_API_KEY || '',
    baseURL: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
    model: process.env.XAI_MODEL || 'grok-beta',
    temperature: parseFloat(process.env.XAI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.XAI_MAX_TOKENS || '4000', 10),
    enabled: process.env.XAI_ENABLED === 'true',
  },
}
```

### Type Definitions

Located at: `src/core/content/types.ts`

```typescript
export enum Language {
  ENGLISH = 'en',
  SPANISH = 'es',
}

export interface AIGeneratedPost {
  text: string;
  hashtags: string[];
  links: string[];
}

export interface AIGeneratedContent {
  english: AIGeneratedPost[];
  spanish: AIGeneratedPost[];
  metadata: {
    generatedAt: Date;
    model: string;
    totalOptions: number;
  };
}

export interface AIContentRequest {
  language?: Language;
  platform?: Platform;
  optionsCount?: number;
  customInstructions?: string;
}
```

## Error Handling

### Service Not Available (503)

If Grok API is not configured:

```json
{
  "error": "AI content generation is not available",
  "message": "Please configure XAI_API_KEY in environment variables"
}
```

**Solution**: Add `XAI_API_KEY` to your `.env` file and set `XAI_ENABLED=true`

### Invalid Parameters (400)

```json
{
  "error": "Invalid platform: invalid_platform"
}
```

**Solution**: Use valid platform names: `twitter`, `telegram`, `instagram`, `tiktok`, `facebook`, `linkedin`, `youtube`

### Generation Failed (500)

```json
{
  "error": "Failed to generate AI content",
  "message": "No content generated from Grok API"
}
```

**Possible Causes**:
- Network connectivity issues
- Invalid API key
- Rate limit exceeded
- Grok API service outage

## Monitoring and Logging

All AI content generation requests are logged with Winston:

```
INFO: Generating AI content { userId: '...', optionsCount: 12, platform: 'twitter' }
INFO: Successfully generated AI content { length: 5234, model: 'grok-beta' }
INFO: AI content generated successfully { userId: '...', englishPosts: 12, spanishPosts: 12 }
```

Errors are logged with full stack traces:

```
ERROR: Error generating AI content { error: '...', stack: '...' }
```

## Best Practices

1. **Cache Results**: Consider caching generated posts to reduce API costs
2. **Batch Generation**: Generate multiple posts at once for better efficiency
3. **Custom Instructions**: Use custom instructions for specific campaigns or events
4. **Monitor Usage**: Track API usage to stay within budget
5. **Test Mode**: Use lower `optionsCount` during development/testing
6. **Error Recovery**: Implement retry logic for transient failures
7. **Content Review**: Review AI-generated content before publishing to ensure brand alignment

## Future Enhancements

Potential improvements for future versions:

- **Content Templates**: Pre-defined templates for common post types
- **Sentiment Analysis**: Ensure positive sentiment in all posts
- **A/B Testing**: Generate variations for performance testing
- **Image Generation**: Integrate AI image generation for visual content
- **Scheduling Integration**: Automatically schedule generated posts
- **Analytics Integration**: Track performance of AI-generated vs manual posts
- **Multi-Language**: Add support for more languages (Portuguese, French, etc.)
- **Voice Customization**: Allow per-user brand voice customization

## Support

For issues or questions:

1. Check the logs in `logs/` directory
2. Verify environment variables are set correctly
3. Test API connectivity: `curl https://api.x.ai/v1/models -H "Authorization: Bearer YOUR_KEY"`
4. Review xAI documentation: https://docs.x.ai

## License

This feature is part of the Social Media Content Hub and follows the same MIT license.
