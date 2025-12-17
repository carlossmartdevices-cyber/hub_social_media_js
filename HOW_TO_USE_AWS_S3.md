# 🪣 How to Use AWS S3 in This Project

## Quick Answer

This project has **built-in AWS S3 support** for storing videos, images, and files in the cloud.

---

## 3-Minute Setup

### 1. Create AWS Account
- Go to [aws.amazon.com](https://aws.amazon.com)
- Sign up (free tier available)

### 2. Get Credentials
- Go to **IAM** → **Users** → **Create User**
- Attach **AmazonS3FullAccess** policy
- Create **Access Keys**
- Copy the keys

### 3. Create S3 Bucket
- Go to **S3** service
- Click **Create Bucket**
- Name: `clickera-media`
- Region: `us-east-1`

### 4. Update `.env`
```env
AWS_S3_ENABLED=true
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJal...
AWS_S3_BUCKET=clickera-media
```

### 5. Restart
```bash
docker-compose down && docker-compose up -d
```

---

## Upload Videos

### Via Web UI
1. Go to http://localhost:3002
2. Login
3. Click "Upload Video"
4. Select video file
5. Click "Upload"
6. Video is now in S3! ✅

### Via API
```bash
curl -X POST http://localhost:3000/api/video/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "video=@video.mp4" \
  -F "title=My Video"
```

### Via Code
```typescript
import storageService from './services/StorageService';

const result = await storageService.upload(buffer, {
  folder: 'videos',
  filename: 'video.mp4',
  contentType: 'video/mp4',
  isPublic: true
});

console.log(result.url);  // S3 URL
```

---

## What Gets Stored

| Type | Location | Access |
|------|----------|--------|
| Videos | `s3://bucket/videos/` | Public |
| Thumbnails | `s3://bucket/thumbnails/` | Public |
| Private files | `s3://bucket/private/` | Signed URL |

---

## Features

✅ **Automatic Fallback** - Uses local storage if S3 fails  
✅ **Signed URLs** - Temporary access for private files  
✅ **Auto Compression** - Videos optimized for web  
✅ **Thumbnails** - Auto-generated from videos  
✅ **Scalable** - Unlimited storage  
✅ **Secure** - Encrypted credentials  

---

## Pricing

- **Storage**: $0.023/GB/month
- **Requests**: $0.0004 per 1,000 requests
- **Free tier**: 5 GB + 20,000 requests/month

---

## Troubleshooting

### Upload fails?
- ✅ Check AWS credentials in `.env`
- ✅ Verify bucket exists
- ✅ Check IAM permissions

### Can't access videos?
- ✅ Check if file is public
- ✅ Verify S3 bucket policy
- ✅ Check signed URL expiration

### Still using local storage?
- ✅ Check `AWS_S3_ENABLED=true`
- ✅ Verify all credentials are set
- ✅ Restart application

---

## Documentation

📚 **More detailed guides:**
- `AWS_S3_SETUP_GUIDE.md` - Step-by-step setup
- `AWS_S3_COMPLETE_GUIDE.md` - Advanced configuration
- `AWS_S3_EXAMPLES.md` - Code examples
- `AWS_S3_STATUS.md` - Current status

---

## Current Status

```
✅ S3 Support: Implemented
⚠️ Configuration: Not configured (using local storage)
✅ Ready to use: Yes
```

---

## Next Steps

1. Create AWS account
2. Get AWS credentials
3. Create S3 bucket
4. Update `.env` file
5. Restart application
6. Upload a test video

---

**That's it!** Your videos are now in the cloud! ☁️

**Last Updated**: 2025-11-29

