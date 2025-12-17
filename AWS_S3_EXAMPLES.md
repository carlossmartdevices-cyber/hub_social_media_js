# 🪣 AWS S3 - Practical Examples

## Example 1: Upload Video to S3

### Using cURL

```bash
# 1. Get authentication token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }' | jq -r '.accessToken')

# 2. Upload video to S3
curl -X POST http://localhost:3000/api/video/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@my-video.mp4" \
  -F "title=My Awesome Video" \
  -F "description=This is my video" \
  -F "quality=high"
```

### Response

```json
{
  "success": true,
  "post": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://clickera-media.s3.us-east-1.amazonaws.com/videos/550e8400_1234567890.mp4",
    "thumbnailUrl": "https://clickera-media.s3.us-east-1.amazonaws.com/thumbnails/550e8400_1234567890.jpg",
    "metadata": {
      "duration": 120,
      "width": 1920,
      "height": 1080,
      "size": 50000000,
      "format": "mp4",
      "bitrate": 3500
    },
    "compressionRatio": 0.75
  }
}
```

---

## Example 2: Upload via Node.js

```typescript
import storageService from './services/StorageService';
import fs from 'fs';

// Read video file
const videoBuffer = fs.readFileSync('./my-video.mp4');

// Upload to S3
const result = await storageService.upload(videoBuffer, {
  folder: 'videos',
  filename: 'my-video.mp4',
  contentType: 'video/mp4',
  isPublic: true  // Public access
});

console.log('Video URL:', result.url);
console.log('S3 Key:', result.key);
console.log('Bucket:', result.bucket);
```

---

## Example 3: Private File with Signed URL

```typescript
// Upload as private
const result = await storageService.upload(videoBuffer, {
  folder: 'private-videos',
  filename: 'private-video.mp4',
  contentType: 'video/mp4',
  isPublic: false  // Private access
});

// Get signed URL (valid for 1 hour)
const signedUrl = await storageService.getSignedUrl(
  result.key,
  3600  // 1 hour in seconds
);

console.log('Temporary URL:', signedUrl);
// URL expires after 1 hour
```

---

## Example 4: Delete File from S3

```typescript
// Delete file
await storageService.delete('videos/my-video.mp4');

console.log('File deleted from S3');
```

---

## Example 5: Batch Upload Multiple Videos

```typescript
const videos = [
  { path: './video1.mp4', title: 'Video 1' },
  { path: './video2.mp4', title: 'Video 2' },
  { path: './video3.mp4', title: 'Video 3' }
];

for (const video of videos) {
  const buffer = fs.readFileSync(video.path);
  
  const result = await storageService.upload(buffer, {
    folder: 'videos',
    filename: `${video.title}.mp4`,
    contentType: 'video/mp4',
    isPublic: true
  });
  
  console.log(`Uploaded: ${result.url}`);
}
```

---

## Example 6: Generate Signed URL for Download

```typescript
// For private files, generate temporary download link
const downloadUrl = await storageService.getSignedUrl(
  'private-videos/confidential.mp4',
  7200  // 2 hours
);

// Send to user
res.json({
  downloadUrl,
  expiresIn: 7200,
  message: 'Link expires in 2 hours'
});
```

---

## Example 7: Upload with Custom Metadata

```typescript
// Upload with custom folder structure
const result = await storageService.upload(videoBuffer, {
  folder: `users/${userId}/videos`,
  filename: `${Date.now()}-${title}.mp4`,
  contentType: 'video/mp4',
  isPublic: false
});

// Store in database
await db.query(
  'INSERT INTO videos (id, url, key, user_id) VALUES ($1, $2, $3, $4)',
  [videoId, result.url, result.key, userId]
);
```

---

## Example 8: Check Storage Status

```typescript
// Check if S3 is enabled
const isS3Enabled = config.storage.s3.enabled;

if (isS3Enabled) {
  console.log('Using AWS S3');
  console.log('Bucket:', config.storage.s3.bucket);
  console.log('Region:', config.storage.s3.region);
} else {
  console.log('Using local filesystem');
  console.log('Path:', config.media.storagePath);
}
```

---

## 🔗 S3 URL Format

### Public File
```
https://bucket-name.s3.region.amazonaws.com/folder/filename
https://clickera-media.s3.us-east-1.amazonaws.com/videos/video.mp4
```

### Signed URL (Private File)
```
https://bucket-name.s3.region.amazonaws.com/folder/filename?
  X-Amz-Algorithm=AWS4-HMAC-SHA256&
  X-Amz-Credential=...&
  X-Amz-Date=...&
  X-Amz-Expires=3600&
  X-Amz-SignedHeaders=host&
  X-Amz-Signature=...
```

---

## 📊 Quality Settings

```typescript
// High quality (larger file)
quality: 'high'      // 5000 kbps

// Medium quality (balanced)
quality: 'medium'    // 3500 kbps

// Low quality (smaller file)
quality: 'low'       // 1500 kbps
```

---

**Last Updated**: 2025-11-29

