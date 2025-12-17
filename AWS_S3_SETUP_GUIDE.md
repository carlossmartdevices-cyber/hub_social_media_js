# 🪣 AWS S3 Setup & Usage Guide

## Overview

This project supports **AWS S3 for file storage** (videos, images, etc.). You can switch between local filesystem and AWS S3 storage.

---

## 🚀 Quick Start

### 1. Enable AWS S3 in `.env`

Add these environment variables to your `.env` file:

```env
# AWS S3 Configuration
AWS_S3_ENABLED=true
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET=your-bucket-name
```

### 2. Get AWS Credentials

1. Go to [AWS Console](https://console.aws.amazon.com)
2. Navigate to **IAM** → **Users**
3. Create a new user or use existing one
4. Attach policy: **AmazonS3FullAccess**
5. Create access keys
6. Copy **Access Key ID** and **Secret Access Key**

### 3. Create S3 Bucket

1. Go to **S3** in AWS Console
2. Click **Create Bucket**
3. Name: `your-bucket-name`
4. Region: `us-east-1` (or your preferred region)
5. Click **Create**

### 4. Restart Application

```bash
docker-compose down
docker-compose up -d
```

---

## 📤 Upload Files to S3

### Via API

**Endpoint**: `POST /api/video/upload`

```bash
curl -X POST http://localhost:3000/api/video/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@video.mp4" \
  -F "title=My Video" \
  -F "description=Video description" \
  -F "quality=medium"
```

**Response**:
```json
{
  "success": true,
  "post": {
    "id": "post-uuid",
    "url": "https://your-bucket.s3.us-east-1.amazonaws.com/videos/...",
    "thumbnailUrl": "https://your-bucket.s3.us-east-1.amazonaws.com/thumbnails/...",
    "metadata": {
      "duration": 120,
      "width": 1920,
      "height": 1080,
      "size": 50000000
    }
  }
}
```

### Via Code

```typescript
import storageService from './services/StorageService';

// Upload a file
const result = await storageService.upload(buffer, {
  folder: 'videos',
  filename: 'my-video.mp4',
  contentType: 'video/mp4',
  isPublic: true  // Public or private
});

console.log(result.url);  // S3 URL
console.log(result.key);  // S3 key
```

---

## 🔐 Private vs Public Files

### Public Files
```typescript
const result = await storageService.upload(buffer, {
  isPublic: true  // Anyone can access
});
// URL: https://bucket.s3.region.amazonaws.com/key
```

### Private Files
```typescript
const result = await storageService.upload(buffer, {
  isPublic: false  // Requires signed URL
});
// URL: Signed URL (expires in 1 hour)
```

---

## 🔗 Get Signed URLs

For private files, generate temporary access URLs:

```typescript
const signedUrl = await storageService.getSignedUrl(
  'videos/my-video.mp4',
  3600  // Expires in 1 hour
);
```

---

## 🗑️ Delete Files

```typescript
await storageService.delete('videos/my-video.mp4');
```

---

## 📊 Configuration

| Setting | Environment Variable | Default |
|---------|----------------------|---------|
| Enable S3 | `AWS_S3_ENABLED` | `false` |
| Region | `AWS_REGION` | `us-east-1` |
| Bucket | `AWS_S3_BUCKET` | `` |
| Access Key | `AWS_ACCESS_KEY_ID` | `` |
| Secret Key | `AWS_SECRET_ACCESS_KEY` | `` |

---

## 🔄 Fallback to Local Storage

If S3 is not configured or credentials are missing, the app automatically falls back to local filesystem storage at `./uploads`.

---

## 🆘 Troubleshooting

### S3 Upload Fails
- ✅ Check AWS credentials in `.env`
- ✅ Verify bucket exists and region is correct
- ✅ Check IAM user has S3 permissions
- ✅ Check logs: `docker logs content-hub-app`

### Access Denied
- ✅ Verify IAM policy includes `s3:*` permissions
- ✅ Check bucket policy allows your IAM user

### Signed URLs Expire
- ✅ Default expiration: 1 hour
- ✅ Customize: `getSignedUrl(key, 7200)` for 2 hours

---

## 📝 Example: Upload Video to S3

```bash
# 1. Get auth token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.accessToken')

# 2. Upload video
curl -X POST http://localhost:3000/api/video/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@my-video.mp4" \
  -F "title=My Video" \
  -F "quality=high"
```

---

**Status**: ✅ Ready to use  
**Last Updated**: 2025-11-29

