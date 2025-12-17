# 🪣 AWS S3 Status & Configuration

## Current Status

| Component | Status | Details |
|-----------|--------|---------|
| AWS S3 Support | ✅ Implemented | Code ready to use |
| Configuration | ⚠️ Not Configured | Needs AWS credentials |
| Storage Service | ✅ Active | Falls back to local storage |
| Video Upload | ✅ Working | Uses local storage by default |

---

## 📝 Current Configuration

```env
AWS_S3_ENABLED=false          # Currently disabled
AWS_REGION=us-east-1          # Default region
AWS_ACCESS_KEY_ID=            # Empty - needs your key
AWS_SECRET_ACCESS_KEY=        # Empty - needs your secret
AWS_S3_BUCKET=                # Empty - needs bucket name
```

---

## 🔄 How It Works

### Current Flow (Local Storage)
```
Upload Video → Multer → Local Filesystem (./uploads)
```

### With AWS S3 Enabled
```
Upload Video → Multer → AWS S3 Bucket → Signed URL
```

---

## 🚀 To Enable AWS S3

### 1. Get AWS Credentials
- Go to [AWS Console](https://console.aws.amazon.com)
- Create IAM user with S3 access
- Get Access Key ID and Secret Access Key

### 2. Create S3 Bucket
- Go to S3 service
- Create bucket (e.g., `clickera-media`)
- Note the region (e.g., `us-east-1`)

### 3. Update .env
```env
AWS_S3_ENABLED=true
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
AWS_S3_BUCKET=clickera-media
```

### 4. Restart Application
```bash
docker-compose down
docker-compose up -d
```

---

## 📂 File Organization in S3

```
clickera-media/
├── videos/
│   ├── post-uuid_timestamp.mp4
│   └── ...
├── thumbnails/
│   ├── post-uuid_timestamp.jpg
│   └── ...
└── uploads/
    └── ...
```

---

## 🔐 Security

### Public Files
- Anyone can access via direct URL
- Good for: Videos, thumbnails
- URL: `https://bucket.s3.region.amazonaws.com/key`

### Private Files
- Requires signed URL
- Expires after set time (default: 1 hour)
- Good for: User-specific content

---

## 💾 Storage Limits

| Setting | Value |
|---------|-------|
| Max Image Size | 10 MB |
| Max Video Size | 100 MB |
| S3 Bucket Limit | Unlimited |

---

## 📊 Monitoring

Check if S3 is working:

```bash
# View logs
docker logs content-hub-app | grep -i "storage\|s3"

# Should show:
# "StorageService initialized with AWS S3 (bucket: clickera-media)"
# OR
# "StorageService initialized with local filesystem"
```

---

## 🆘 Common Issues

### Issue: "S3 bucket not configured"
**Solution**: Check `AWS_S3_BUCKET` in `.env`

### Issue: "Access Denied"
**Solution**: Verify IAM user has `s3:*` permissions

### Issue: "Signed URL expired"
**Solution**: Generate new URL or increase expiration time

---

## 📚 Documentation

- `AWS_S3_SETUP_GUIDE.md` - Quick setup guide
- `AWS_S3_COMPLETE_GUIDE.md` - Detailed guide with examples

---

## ✅ Next Steps

1. Create AWS account (if needed)
2. Get AWS credentials
3. Create S3 bucket
4. Update `.env` file
5. Restart application
6. Test video upload

---

**Last Updated**: 2025-11-29  
**Status**: Ready to configure

