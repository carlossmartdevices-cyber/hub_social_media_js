# Adult Content Features - pnptv.app Preview System

## 📋 Overview

This document describes the new features implemented for managing adult content previews (15-45 second videos) optimized for the **gay latino smoking/pnp niche**, hosted on `previews.pnptv.app`.

---

## 🎯 Key Features Implemented

### 1. **Strict Video Validation (15-45 seconds, 720p)**
   - ✅ Minimum duration: **15 seconds**
   - ✅ Maximum duration: **45 seconds** (automatic trimming)
   - ✅ Target resolution: **720p (1280x720)**
   - ✅ Optimized bitrate: **3000 kbps** for high-quality short videos
   - ✅ Maximum file size: **100MB** (optimized for Twitter/X)

### 2. **Performer Tracking**
   - Track multiple performers per video
   - SEO-optimized performer names in titles and descriptions
   - Searchable performer database via JSONB indexes

### 3. **Niche-Specific SEO (Gay Latino + Smoking + PnP)**
   - Specialized Grok AI prompts for adult content SEO
   - Keywords: `gay latino smoking`, `pnp party boys`, `latino twinks smoking`, `gay smoking fetish`, `party and play`
   - Long-tail queries: `hot latino guys smoking pnp`, `gay smoking fetish videos latino`
   - Voice search optimization: `where to find latino gay smoking content`

### 4. **AWS S3 Hosting (previews.pnptv.app)**
   - Automatic upload to S3 bucket
   - CloudFront CDN distribution
   - Public URLs: `https://previews.pnptv.app/videos/{filename}`
   - Thumbnail URLs: `https://previews.pnptv.app/thumbnails/{filename}`

### 5. **Bulk Upload Support**
   - Upload up to 6 videos simultaneously
   - AI-generated metadata for each video
   - Bilingual posts (English + Spanish)
   - Schedule up to **24 posts** in the future

---

## 🗂️ Files Changed/Created

### **Backend Services**

1. **`src/services/VideoProcessingService.ts`** ⭐ UPDATED
   - Added `ADULT_CONTENT_CONSTRAINTS` for 15-45s, 720p validation
   - Added `validateAdultContentVideo()` method
   - Added `isAdultContent` option to `processVideo()`
   - Automatic trimming for videos > 45s
   - Rejection for videos < 15s

2. **`src/services/AIContentGenerationService.ts`** ⭐ UPDATED
   - Added `generateAdultContentMetadata()` method
   - Specialized Grok prompts for gay latino smoking/pnp niche
   - Performer integration in SEO metadata
   - Niche-specific keywords and hashtags

3. **`src/services/S3StorageService.ts`** ⭐ NEW
   - Upload videos to AWS S3
   - Upload thumbnails to AWS S3
   - Generate public CDN URLs
   - Delete operations for cleanup
   - Batch upload support

### **Database**

4. **`src/database/migrations/005_add_performers_and_niche_metadata.sql`** ⭐ NEW
   - Extended `video_metadata` JSONB structure
   - Added `performers` array field
   - Added `niche` object (primary + tags)
   - Added `seo` object (keywords, queries, etc.)
   - Added `hosting` object (S3 URLs)
   - Created GIN indexes for performer/keyword search
   - Created `adult_content_posts` view for queries
   - Added trigger for adult content validation

### **Configuration**

5. **`package.json`** ⭐ UPDATED
   - Added `@aws-sdk/client-s3": "^3.600.0`

6. **`.env.example`** ⭐ UPDATED
   - Added AWS S3 configuration section:
     ```env
     AWS_REGION=us-east-1
     AWS_ACCESS_KEY_ID=your_aws_access_key_here
     AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
     AWS_S3_BUCKET=pnptv-previews
     CLOUDFRONT_DOMAIN=previews.pnptv.app
     ```

### **Frontend (Partial Updates)**

7. **`client/src/components/VideoUploader.tsx`** ⭐ UPDATED
   - Added `performers` state (comma-separated string)
   - Updated `VideoMetadata` interface with `performers` and `niche` fields

---

## 🚀 Setup Instructions

### **Step 1: Install Dependencies**

```bash
npm install
```

This will install the new `@aws-sdk/client-s3` package.

### **Step 2: Configure AWS S3**

1. Create an S3 bucket named `pnptv-previews` (or your preferred name)
2. Configure bucket for public read access
3. Set up CloudFront distribution pointing to `previews.pnptv.app`
4. Get your AWS credentials (Access Key ID and Secret Access Key)

### **Step 3: Update Environment Variables**

Edit your `.env` file and add:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET=pnptv-previews
CLOUDFRONT_DOMAIN=previews.pnptv.app

# Video Directories
VIDEO_UPLOAD_DIR=./uploads/videos
THUMBNAIL_DIR=./uploads/thumbnails
```

### **Step 4: Run Database Migration**

```bash
npm run db:migrate
```

Or manually execute:

```bash
psql -h localhost -U postgres -d content_hub -f src/database/migrations/005_add_performers_and_niche_metadata.sql
```

### **Step 5: Restart Application**

```bash
npm run dev
```

---

## 📐 New Metadata Structure

### **Example: Adult Content Video Metadata**

```json
{
  "title": "Hot Latino Twinks - Smoking Session with Carlos, Miguel",
  "description": "Watch Carlos and Miguel in this exclusive smoking session. Hot latino action, pnp vibes, and steamy content.",
  "performers": ["Carlos", "Miguel"],

  "niche": {
    "primary": "gay",
    "tags": ["latino", "smoking", "pnp", "twink", "party", "fetish"]
  },

  "seo": {
    "title": "Gay Latino Smoking PnP: Carlos & Miguel - Hot Twink Action",
    "metaDescription": "Exclusive gay latino smoking content featuring Carlos and Miguel. Watch hot twinks in steamy pnp party sessions.",
    "targetKeyword": "gay latino smoking pnp",
    "keywords": [
      "gay latino smoking",
      "pnp party boys",
      "latino twinks smoking",
      "gay smoking fetish",
      "party and play latino"
    ],
    "longTailQueries": [
      "hot latino guys smoking pnp",
      "gay smoking fetish videos latino",
      "pnp party twinks smoking"
    ],
    "voiceSearchQueries": [
      "where to find latino gay smoking content",
      "best gay pnp smoking videos with latinos"
    ]
  },

  "social": {
    "titleEN": "🔥 Carlos & Miguel - Latino Smoking Session",
    "descriptionEN": "Hot latino twinks getting wild. Exclusive smoking content. Full video link in bio.",
    "hashtagsEN": ["#GayLatino", "#SmokingFetish", "#PnPParty", "#LatinoTwinks"],
    "titleES": "🔥 Carlos y Miguel - Sesión Fumando",
    "descriptionES": "Chavos latinos calientes. Contenido exclusivo fumando. Link completo en bio.",
    "hashtagsES": ["#LatinoGay", "#FeticheFumar", "#FiestaPnP"],
    "cta": "Watch full 10-minute version at pnptv.app 💦"
  },

  "hosting": {
    "previewUrl": "https://previews.pnptv.app/videos/abc123_preview.mp4",
    "thumbnailUrl": "https://previews.pnptv.app/thumbnails/abc123_thumb.jpg",
    "fullVideoUrl": "https://pnptv.app/watch/abc123",
    "cdnProvider": "cloudflare"
  }
}
```

---

## 🎨 Workflow Example

### **1. Upload Video**
```javascript
// Frontend: User uploads video
const formData = new FormData();
formData.append('video', videoFile);
formData.append('isAdultContent', 'true'); // Enable strict validation
```

### **2. Server Processes Video**
```typescript
// Backend: VideoProcessingService
const result = await videoProcessingService.processVideo(
  inputPath,
  postId,
  { isAdultContent: true } // Triggers 15-45s, 720p validation
);
// If video is 60s, it will be trimmed to 45s
// If video is 10s, it will be rejected
```

### **3. Generate Metadata with Grok**
```typescript
// Backend: AIContentGenerationService
const metadata = await aiService.generateAdultContentMetadata(
  "Hot smoking session with Carlos and Miguel",
  ["Carlos", "Miguel"], // Performers
  "carlos_miguel_smoking.mp4"
);
```

### **4. Upload to S3**
```typescript
// Backend: S3StorageService
const { videoUrl, thumbnailUrl } = await s3Service.uploadVideoWithThumbnail(
  processedVideoPath,
  thumbnailPath,
  postId
);
// Returns:
// videoUrl: https://previews.pnptv.app/videos/abc123.mp4
// thumbnailUrl: https://previews.pnptv.app/thumbnails/abc123_thumb.jpg
```

### **5. Schedule Post**
```typescript
// Schedule for future publication
await api.post('/posts/schedule', {
  content: metadata.social.descriptionEN,
  scheduledAt: '2025-11-27T14:30:00Z',
  platforms: ['twitter'],
  mediaUrl: videoUrl
});
```

---

## 🔍 Database Queries

### **Search videos by performer:**
```sql
SELECT * FROM posts
WHERE video_metadata -> 'performers' @> '["Carlos"]'::jsonb;
```

### **Search by niche tags:**
```sql
SELECT * FROM posts
WHERE video_metadata -> 'niche' -> 'tags' @> '["smoking", "pnp"]'::jsonb;
```

### **Search by SEO keyword:**
```sql
SELECT * FROM posts
WHERE video_metadata -> 'seo' -> 'keywords' @> '["gay latino smoking"]'::jsonb;
```

### **Get all adult content posts:**
```sql
SELECT * FROM adult_content_posts
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 Video Validation Rules

| Attribute | Requirement | Action if Invalid |
|-----------|-------------|-------------------|
| **Duration** | 15-45 seconds | Reject if < 15s, Trim to 45s if > 45s |
| **Resolution** | 720p (1280x720) | Auto-convert to 720p |
| **Bitrate** | ~3000 kbps | Auto-optimize |
| **Format** | MP4 | Convert if needed |
| **Max Size** | 100MB (after processing) | Auto-compress |

---

## 📱 Twitter/X Posting

### **Optimized for X Algorithm:**
- Short preview videos (15-45s) perform best
- 720p resolution is optimal for mobile viewing
- Hashtags: #GayLatino #SmokingFetish #PnPParty #LatinoTwinks
- CTA linking to full video on pnptv.app
- Post during peak hours (suggested by AI)

### **Anti-Spam Measures:**
- English and Spanish variants are DIFFERENT (not direct translations)
- Different angles/approaches for each language
- Limit to 24 scheduled posts to avoid spam detection
- Varied posting times

---

## 🧪 Testing

### **Test Video Upload:**
```bash
curl -X POST http://localhost:33010/api/video/upload \
  -F "video=@test_video.mp4" \
  -F "title=Test Video" \
  -F "description=Test"
```

### **Test Metadata Generation:**
```bash
curl -X POST http://localhost:33010/api/video/generate-metadata \
  -H "Content-Type: application/json" \
  -d '{
    "userExplanation": "Hot latino guys smoking in party",
    "performers": ["Carlos", "Miguel"],
    "videoFileName": "test.mp4"
  }'
```

### **Test S3 Upload:**
```typescript
import { s3StorageService } from './services/S3StorageService';

const videoUrl = await s3StorageService.uploadVideo(
  './test_video.mp4',
  'test_upload.mp4'
);
console.log('Video URL:', videoUrl);
```

---

## 🔐 Security Notes

- Never commit AWS credentials to Git
- Use IAM roles in production (not access keys)
- Ensure S3 bucket has proper CORS configuration
- CloudFront should have signed URLs for premium content
- Adult content should be age-gated on pnptv.app

---

## 📈 Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure AWS S3 credentials in `.env`
3. ✅ Run database migration
4. ⏳ Update UI components (BulkVideoUploader, VideoUploader) with performer fields
5. ⏳ Test video upload → processing → S3 → publish flow
6. ⏳ Configure CloudFront for previews.pnptv.app
7. ⏳ Test scheduling up to 24 posts
8. ⏳ Monitor Twitter/X engagement analytics

---

## 📞 Support

For questions or issues:
- Check logs: `tail -f logs/application.log`
- Database issues: `psql -d content_hub`
- S3 issues: Check AWS CloudWatch logs
- Grok AI issues: Verify XAI_API_KEY in `.env`

---

## 📝 Summary

This implementation provides:
- ✅ Strict video validation (15-45s, 720p)
- ✅ Performer tracking and SEO
- ✅ Niche-specific AI content generation (gay latino smoking pnp)
- ✅ AWS S3 hosting with CDN (previews.pnptv.app)
- ✅ Bulk upload support (up to 6 videos)
- ✅ Scheduling up to 24 posts
- ✅ Database schema for adult content metadata

**Status:** ✅ Backend implementation complete. Frontend UI updates pending.
